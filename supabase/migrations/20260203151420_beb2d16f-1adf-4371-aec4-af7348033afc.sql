-- =====================================================
-- MIGRAÇÃO: Sistema de Viagens (Trip-Centric Tracking)
-- Modelo enterprise: offline-first, edge-driven, banco passivo
-- =====================================================

-- 1. Limpar estrutura antiga (nome correto do trigger)
-- =====================================================
DROP TRIGGER IF EXISTS trigger_sync_localizacoes_historico ON public.locations;
DROP TRIGGER IF EXISTS sync_locations_to_tracking ON public.locations;
DROP FUNCTION IF EXISTS public.sync_localizacoes_to_tracking_historico() CASCADE;
DROP TABLE IF EXISTS public.tracking_historico CASCADE;

-- 2. Enum de status de viagem
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.status_viagem AS ENUM ('em_andamento', 'finalizada', 'cancelada');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Tabela principal: viagens
-- =====================================================
CREATE TABLE public.viagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  motorista_id UUID NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
  carroceria_id UUID REFERENCES public.carrocerias(id) ON DELETE SET NULL,
  status public.status_viagem NOT NULL DEFAULT 'em_andamento',
  km_total NUMERIC(10, 2) NULL,
  tempo_total_minutos INTEGER NULL,
  inicio_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  fim_em TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para viagens
CREATE INDEX idx_viagens_motorista_status ON public.viagens(motorista_id, status);
CREATE INDEX idx_viagens_created_at ON public.viagens(created_at DESC);

-- Trigger updated_at
CREATE TRIGGER update_viagens_updated_at
  BEFORE UPDATE ON public.viagens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 4. Gerador de código de viagem (VGM-YYYY-NNNN)
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_viagem_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ano TEXT;
  sequencia INTEGER;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    ano := EXTRACT(YEAR FROM NOW())::TEXT;
    
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(codigo FROM 'VGM-' || ano || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO sequencia
    FROM public.viagens
    WHERE codigo LIKE 'VGM-' || ano || '-%';
    
    NEW.codigo := 'VGM-' || ano || '-' || LPAD(sequencia::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_viagem_codigo_trigger
  BEFORE INSERT ON public.viagens
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_viagem_codigo();

-- 5. Tabela junction: viagem_entregas (N:N)
-- =====================================================
CREATE TABLE public.viagem_entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID NOT NULL REFERENCES public.viagens(id) ON DELETE CASCADE,
  entrega_id UUID NOT NULL REFERENCES public.entregas(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(viagem_id, entrega_id)
);

CREATE INDEX idx_viagem_entregas_viagem ON public.viagem_entregas(viagem_id);
CREATE INDEX idx_viagem_entregas_entrega ON public.viagem_entregas(entrega_id);

-- 6. Nova tabela: tracking_historico (offline-first)
-- =====================================================
CREATE TABLE public.tracking_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID NOT NULL REFERENCES public.viagens(id) ON DELETE CASCADE,
  tracked_at TIMESTAMPTZ NOT NULL,  -- Timestamp REAL do GPS (offline-first)
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  altitude NUMERIC(8, 2) NULL,
  speed NUMERIC(6, 2) NULL,
  heading NUMERIC(5, 2) NULL,
  accuracy NUMERIC(6, 2) NULL,
  status public.status_entrega NULL,
  observacao TEXT NULL,
  request_id UUID NULL,  -- Idempotência para retry de batch
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices otimizados para replay e queries
CREATE INDEX idx_tracking_viagem_tracked ON public.tracking_historico(viagem_id, tracked_at);
CREATE INDEX idx_tracking_created_at ON public.tracking_historico(created_at DESC);

-- Índice único para idempotência (evita duplicatas em retry)
CREATE UNIQUE INDEX uniq_tracking_viagem_request 
  ON public.tracking_historico(viagem_id, request_id) 
  WHERE request_id IS NOT NULL;

-- 7. Funções auxiliares para Edge Functions
-- =====================================================

-- Buscar viagem ativa do motorista
CREATE OR REPLACE FUNCTION public.get_viagem_ativa(p_motorista_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.viagens
  WHERE motorista_id = p_motorista_id
    AND status = 'em_andamento'
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Criar viagem agrupando entregas
CREATE OR REPLACE FUNCTION public.criar_viagem_para_entregas(
  p_motorista_id UUID,
  p_veiculo_id UUID,
  p_carroceria_id UUID,
  p_entrega_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viagem_id UUID;
  v_entrega_id UUID;
  v_ordem INTEGER := 1;
BEGIN
  -- Criar a viagem
  INSERT INTO public.viagens (motorista_id, veiculo_id, carroceria_id, codigo)
  VALUES (p_motorista_id, p_veiculo_id, p_carroceria_id, '')
  RETURNING id INTO v_viagem_id;

  -- Vincular entregas
  FOREACH v_entrega_id IN ARRAY p_entrega_ids
  LOOP
    INSERT INTO public.viagem_entregas (viagem_id, entrega_id, ordem)
    VALUES (v_viagem_id, v_entrega_id, v_ordem)
    ON CONFLICT (viagem_id, entrega_id) DO NOTHING;
    v_ordem := v_ordem + 1;
  END LOOP;

  RETURN v_viagem_id;
END;
$$;

-- Finalizar viagem com cálculos
CREATE OR REPLACE FUNCTION public.finalizar_viagem(p_viagem_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio TIMESTAMPTZ;
  v_fim TIMESTAMPTZ;
  v_tempo_minutos INTEGER;
  v_km_total NUMERIC(10, 2) := 0;
  r_prev RECORD;
  r_curr RECORD;
  v_first BOOLEAN := TRUE;
BEGIN
  -- Buscar timestamps do histórico
  SELECT MIN(tracked_at), MAX(tracked_at)
  INTO v_inicio, v_fim
  FROM public.tracking_historico
  WHERE viagem_id = p_viagem_id;

  -- Calcular tempo total
  IF v_inicio IS NOT NULL AND v_fim IS NOT NULL THEN
    v_tempo_minutos := EXTRACT(EPOCH FROM (v_fim - v_inicio)) / 60;
  END IF;

  -- Calcular km total (Haversine simplificado)
  FOR r_curr IN
    SELECT latitude, longitude
    FROM public.tracking_historico
    WHERE viagem_id = p_viagem_id
    ORDER BY tracked_at
  LOOP
    IF v_first THEN
      v_first := FALSE;
    ELSE
      v_km_total := v_km_total + (
        2 * 6371 * asin(sqrt(
          power(sin(radians((r_curr.latitude - r_prev.latitude) / 2)), 2) +
          cos(radians(r_prev.latitude)) * 
          cos(radians(r_curr.latitude)) * 
          power(sin(radians((r_curr.longitude - r_prev.longitude) / 2)), 2)
        ))
      );
    END IF;
    r_prev := r_curr;
  END LOOP;

  -- Atualizar viagem
  UPDATE public.viagens
  SET status = 'finalizada',
      fim_em = now(),
      km_total = v_km_total,
      tempo_total_minutos = v_tempo_minutos,
      updated_at = now()
  WHERE id = p_viagem_id;
END;
$$;

-- 8. RLS Policies
-- =====================================================
ALTER TABLE public.viagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viagem_entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_historico ENABLE ROW LEVEL SECURITY;

-- Viagens: motorista vê as próprias, empresa vê da frota
CREATE POLICY "Motorista vê próprias viagens"
  ON public.viagens FOR SELECT
  TO authenticated
  USING (
    motorista_id = public.get_user_motorista_id(auth.uid())
    OR public.user_belongs_to_empresa(auth.uid(), (
      SELECT empresa_id FROM public.motoristas WHERE id = motorista_id
    ))
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Sistema pode inserir viagens"
  ON public.viagens FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar viagens"
  ON public.viagens FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Viagem_entregas: segue mesma lógica
CREATE POLICY "Usuários veem vínculos de viagens acessíveis"
  ON public.viagem_entregas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.viagens v
      WHERE v.id = viagem_id
        AND (
          v.motorista_id = public.get_user_motorista_id(auth.uid())
          OR public.user_belongs_to_empresa(auth.uid(), (
            SELECT empresa_id FROM public.motoristas WHERE id = v.motorista_id
          ))
          OR public.is_admin(auth.uid())
        )
    )
  );

CREATE POLICY "Sistema pode gerenciar vínculos"
  ON public.viagem_entregas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tracking: apenas leitura para usuários, escrita via service role
CREATE POLICY "Usuários veem tracking de viagens acessíveis"
  ON public.tracking_historico FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.viagens v
      WHERE v.id = viagem_id
        AND (
          v.motorista_id = public.get_user_motorista_id(auth.uid())
          OR public.user_belongs_to_empresa(auth.uid(), (
            SELECT empresa_id FROM public.motoristas WHERE id = v.motorista_id
          ))
          OR public.is_admin(auth.uid())
        )
    )
  );

CREATE POLICY "Edge Function insere tracking"
  ON public.tracking_historico FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 9. Comentários para documentação
-- =====================================================
COMMENT ON TABLE public.viagens IS 'Viagens (trips) agrupam múltiplas entregas para rastreamento unificado';
COMMENT ON TABLE public.viagem_entregas IS 'Junction table N:N entre viagens e entregas com ordem de parada';
COMMENT ON TABLE public.tracking_historico IS 'Histórico GPS offline-first - tracked_at é o timestamp real do dispositivo';
COMMENT ON COLUMN public.tracking_historico.tracked_at IS 'Timestamp REAL capturado pelo GPS do dispositivo (offline-first)';
COMMENT ON COLUMN public.tracking_historico.request_id IS 'UUID para idempotência em retry de batch - evita duplicatas';
COMMENT ON FUNCTION public.get_viagem_ativa IS 'Retorna viagem ativa do motorista para Edge Function';
COMMENT ON FUNCTION public.criar_viagem_para_entregas IS 'Cria viagem agrupando array de entregas';
COMMENT ON FUNCTION public.finalizar_viagem IS 'Encerra viagem calculando km e tempo total';