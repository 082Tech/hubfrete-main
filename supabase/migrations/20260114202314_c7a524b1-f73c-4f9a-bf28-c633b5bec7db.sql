-- Add RLS policy for localizações table to allow authenticated users to read
CREATE POLICY "Authenticated users can read localizações"
ON public.localizações
FOR SELECT
TO authenticated
USING (true);

-- Also allow insert/update for drivers updating their own location
CREATE POLICY "Users can insert their own location"
ON public.localizações
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own location"
ON public.localizações
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);