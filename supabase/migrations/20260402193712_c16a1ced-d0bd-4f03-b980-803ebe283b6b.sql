
CREATE OR REPLACE FUNCTION public.get_cargos_for_scope(p_escopo text)
RETURNS TABLE(nome text, descricao text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nome, COALESCE(descricao, '') as descricao
  FROM public.cargos_config
  WHERE escopo = p_escopo
  ORDER BY created_at ASC;
$$;
