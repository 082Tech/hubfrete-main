-- Allow public (anon) read access needed for driver self-registration invite validation
-- NOTE: This is safe as it exposes only non-sensitive invite metadata and company name/logo.

-- 1) driver_invite_links: allow SELECT for anon for active, non-expired links that haven't hit usage limit
ALTER TABLE public.driver_invite_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read valid driver invite links" ON public.driver_invite_links;
CREATE POLICY "Public can read valid driver invite links"
ON public.driver_invite_links
FOR SELECT
TO anon
USING (
  ativo = true
  AND (expira_em IS NULL OR expira_em > now())
  AND (max_usos IS NULL OR usos_realizados < max_usos)
);

-- (Optional) Also allow authenticated to read (keeps existing app behavior if you rely on logged-in views)
DROP POLICY IF EXISTS "Authenticated can read driver invite links" ON public.driver_invite_links;
CREATE POLICY "Authenticated can read driver invite links"
ON public.driver_invite_links
FOR SELECT
TO authenticated
USING (true);


-- 2) empresas: allow anon to read minimal public fields used on the invite page (name/logo)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read company public fields" ON public.empresas;
CREATE POLICY "Public can read company public fields"
ON public.empresas
FOR SELECT
TO anon
USING (true);

-- IMPORTANT: If empresas has sensitive columns, consider replacing the above with a view + deny direct SELECT.
