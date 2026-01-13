-- Add auth_user_id column to Usuarios to link with Supabase Auth
ALTER TABLE public."Usuarios" ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- Create table for tracking company invites
CREATE TABLE IF NOT EXISTS public.company_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID NOT NULL,
  company_type TEXT NOT NULL,
  company_id UUID NOT NULL,
  filial_id INTEGER REFERENCES public."Filiais"(id) ON DELETE SET NULL,
  role public.usuario_cargo NOT NULL DEFAULT 'OPERADOR',
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_invites_company_type_check CHECK (company_type IN ('embarcador', 'transportadora')),
  CONSTRAINT company_invites_status_check CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

-- Enable RLS on company_invites
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invites they sent
CREATE POLICY "Users can view invites they sent"
ON public.company_invites FOR SELECT TO authenticated
USING (invited_by = auth.uid());

-- Policy: Users can view invites sent to their email
CREATE POLICY "Users can view invites sent to them"
ON public.company_invites FOR SELECT TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Policy: Authenticated users can create invites
CREATE POLICY "Authenticated users can create invites"
ON public.company_invites FOR INSERT TO authenticated
WITH CHECK (invited_by = auth.uid());

-- Policy: Users can update invites they sent
CREATE POLICY "Users can update invites they sent"
ON public.company_invites FOR UPDATE TO authenticated
USING (invited_by = auth.uid());

-- Create trigger function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
  new_usuario_id INTEGER;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, nome_completo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Check for pending invites and process them
  FOR invite_record IN 
    SELECT * FROM public.company_invites 
    WHERE email = NEW.email AND status = 'pending'
  LOOP
    -- Update invite status
    UPDATE public.company_invites 
    SET status = 'accepted', accepted_at = NOW() 
    WHERE id = invite_record.id;
    
    -- Create user role based on company type
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invite_record.company_type::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Create Usuarios record
    INSERT INTO public."Usuarios" (email, nome, cargo, motorista_autonomo, auth_user_id)
    VALUES (
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1)),
      invite_record.role,
      false,
      NEW.id
    )
    RETURNING id INTO new_usuario_id;
    
    -- Link to Filial if specified
    IF invite_record.filial_id IS NOT NULL THEN
      INSERT INTO public."Usuarios_Filiais" (usuario_id, filial_id, cargo_na_filial)
      VALUES (new_usuario_id, invite_record.filial_id, invite_record.role);
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_invites_email ON public.company_invites(email);
CREATE INDEX IF NOT EXISTS idx_company_invites_token ON public.company_invites(token);
CREATE INDEX IF NOT EXISTS idx_company_invites_status ON public.company_invites(status);
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_user_id ON public."Usuarios"(auth_user_id);