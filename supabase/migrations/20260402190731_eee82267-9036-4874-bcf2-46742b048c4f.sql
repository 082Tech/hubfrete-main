
CREATE OR REPLACE FUNCTION public.get_cargo_allowed_categories(p_escopo text, p_cargo text)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(DISTINCT split_part(permissao, '.', 1)),
    '{}'::text[]
  )
  FROM public.cargo_permissoes
  WHERE escopo = p_escopo
    AND cargo = p_cargo
    AND permitido = true
$$;
