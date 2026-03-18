
-- Trigger: auto-criar config financeira default quando nova empresa for criada
CREATE OR REPLACE FUNCTION public.auto_create_empresa_config_financeira()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.empresa_config_financeira (empresa_id, tipo_pagamento, prazo_dias, ciclo_faturamento, antecipacao_permitida, taxa_antecipacao_percent, limite_credito, credito_utilizado)
  VALUES (NEW.id, 'pos_pago', 30, 'mensal', false, 2.0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_auto_config_financeira
AFTER INSERT ON public.empresas
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_empresa_config_financeira();
