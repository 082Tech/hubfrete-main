ALTER TABLE public.config_fiscal
  ADD COLUMN IF NOT EXISTS regime_tributario_emitente INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS icms_base_calculo_percentual NUMERIC(5,2) NOT NULL DEFAULT 100.00;

COMMENT ON COLUMN public.config_fiscal.regime_tributario_emitente
  IS '1 = Simples Nacional, 3 = Regime Normal';
COMMENT ON COLUMN public.config_fiscal.icms_base_calculo_percentual
  IS 'Percentual da base de calculo do ICMS (ex: 100.00 = base integral)';