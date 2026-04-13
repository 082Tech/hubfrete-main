
-- 1. Enum expirada
ALTER TYPE public.status_carga ADD VALUE IF NOT EXISTS 'expirada';

-- 2. Colunas de rota planejada em viagens
ALTER TABLE public.viagens ADD COLUMN IF NOT EXISTS rota_planejada_polyline TEXT;
ALTER TABLE public.viagens ADD COLUMN IF NOT EXISTS distancia_planejada_km NUMERIC;
ALTER TABLE public.viagens ADD COLUMN IF NOT EXISTS tempo_estimado_minutos INTEGER;

-- 3. Enriquecer auditoria_logs
ALTER TABLE public.auditoria_logs ADD COLUMN IF NOT EXISTS usuario_nome TEXT;
ALTER TABLE public.auditoria_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.auditoria_logs ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.auditoria_logs ADD COLUMN IF NOT EXISTS registro_codigo TEXT;
ALTER TABLE public.auditoria_logs ADD COLUMN IF NOT EXISTS empresa_nome TEXT;

-- 4. Tabela desvio_auditoria
CREATE TABLE IF NOT EXISTS public.desvio_auditoria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  viagem_id UUID NOT NULL REFERENCES public.viagens(id) ON DELETE CASCADE,
  tracking_historico_id UUID,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  distancia_rota_metros NUMERIC NOT NULL DEFAULT 0,
  status_desvio TEXT NOT NULL DEFAULT 'normal',
  tracked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_desvio_auditoria_viagem ON public.desvio_auditoria(viagem_id);
CREATE INDEX IF NOT EXISTS idx_desvio_auditoria_status ON public.desvio_auditoria(status_desvio);

ALTER TABLE public.desvio_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "desvio_auditoria_select" ON public.desvio_auditoria
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "desvio_auditoria_insert" ON public.desvio_auditoria
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Tabela viagem_metricas_desvio
CREATE TABLE IF NOT EXISTS public.viagem_metricas_desvio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  viagem_id UUID NOT NULL REFERENCES public.viagens(id) ON DELETE CASCADE UNIQUE,
  percentual_fora_rota NUMERIC NOT NULL DEFAULT 0,
  maior_distancia_desvio_metros NUMERIC NOT NULL DEFAULT 0,
  tempo_total_fora_rota_minutos NUMERIC NOT NULL DEFAULT 0,
  total_pontos_analisados INTEGER NOT NULL DEFAULT 0,
  total_pontos_fora_rota INTEGER NOT NULL DEFAULT 0,
  total_pontos_leve_desvio INTEGER NOT NULL DEFAULT 0,
  trechos_desvio JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.viagem_metricas_desvio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viagem_metricas_desvio_select" ON public.viagem_metricas_desvio
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "viagem_metricas_desvio_upsert" ON public.viagem_metricas_desvio
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "viagem_metricas_desvio_update" ON public.viagem_metricas_desvio
  FOR UPDATE USING (auth.uid() IS NOT NULL);
