
CREATE TABLE public.carga_eventos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  carga_id uuid NOT NULL REFERENCES public.cargas(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  observacao text,
  user_id uuid,
  user_nome text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.carga_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carga_eventos_select" ON public.carga_eventos FOR SELECT USING (true);
CREATE POLICY "carga_eventos_insert" ON public.carga_eventos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "carga_eventos_update" ON public.carga_eventos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "carga_eventos_delete" ON public.carga_eventos FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_carga_eventos_carga_id ON public.carga_eventos(carga_id);
CREATE INDEX idx_carga_eventos_timestamp ON public.carga_eventos(timestamp DESC);
