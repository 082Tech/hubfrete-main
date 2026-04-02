
-- ============================================================
-- 1. Add planned route columns to viagens
-- ============================================================
ALTER TABLE public.viagens
  ADD COLUMN IF NOT EXISTS rota_planejada_polyline TEXT,
  ADD COLUMN IF NOT EXISTS distancia_planejada_km NUMERIC,
  ADD COLUMN IF NOT EXISTS tempo_estimado_minutos INTEGER,
  ADD COLUMN IF NOT EXISTS versao_rota INTEGER DEFAULT 1;

-- ============================================================
-- 2. Deviation audit table (per tracking point)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.desvio_auditoria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  viagem_id UUID NOT NULL REFERENCES public.viagens(id) ON DELETE CASCADE,
  tracking_historico_id UUID REFERENCES public.tracking_historico(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  distancia_rota_metros NUMERIC NOT NULL DEFAULT 0,
  status_desvio TEXT NOT NULL DEFAULT 'normal' CHECK (status_desvio IN ('normal', 'leve', 'fora_rota')),
  tracked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_desvio_auditoria_viagem ON public.desvio_auditoria(viagem_id);
CREATE INDEX idx_desvio_auditoria_status ON public.desvio_auditoria(status_desvio);

ALTER TABLE public.desvio_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view desvio_auditoria"
  ON public.desvio_auditoria FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert desvio_auditoria"
  ON public.desvio_auditoria FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- 3. Post-trip deviation metrics (consolidated)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.viagem_metricas_desvio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  viagem_id UUID NOT NULL UNIQUE REFERENCES public.viagens(id) ON DELETE CASCADE,
  percentual_fora_rota NUMERIC DEFAULT 0,
  maior_distancia_desvio_metros NUMERIC DEFAULT 0,
  tempo_total_fora_rota_minutos NUMERIC DEFAULT 0,
  total_pontos_analisados INTEGER DEFAULT 0,
  total_pontos_fora_rota INTEGER DEFAULT 0,
  total_pontos_leve_desvio INTEGER DEFAULT 0,
  trechos_desvio JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.viagem_metricas_desvio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view viagem_metricas_desvio"
  ON public.viagem_metricas_desvio FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert viagem_metricas_desvio"
  ON public.viagem_metricas_desvio FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update viagem_metricas_desvio"
  ON public.viagem_metricas_desvio FOR UPDATE TO authenticated
  USING (true);

CREATE TRIGGER update_viagem_metricas_desvio_updated_at
  BEFORE UPDATE ON public.viagem_metricas_desvio
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
