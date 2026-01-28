-- Remover trigger problemático temporariamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recriar função com tratamento de erros mais robusto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
  new_usuario_id INTEGER;
BEGIN
  -- Check for pending invites and process them
  FOR invite_record IN 
    SELECT * FROM public.company_invites 
    WHERE email = NEW.email AND status = 'pending'
  LOOP
    BEGIN
      -- Update invite status
      UPDATE public.company_invites 
      SET status = 'accepted', accepted_at = NOW() 
      WHERE id = invite_record.id;
      
      -- Create user role based on company type
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, invite_record.company_type::public.app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
      
      -- Create usuarios record
      INSERT INTO public.usuarios (email, nome, cargo, motorista_autonomo, auth_user_id)
      VALUES (
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1)),
        invite_record.role,
        false,
        NEW.id
      )
      RETURNING id INTO new_usuario_id;
      
      -- Link to filial if specified
      IF invite_record.filial_id IS NOT NULL THEN
        INSERT INTO public.usuarios_filiais (usuario_id, filial_id, cargo_na_filial)
        VALUES (new_usuario_id, invite_record.filial_id, invite_record.role);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the user creation
      RAISE WARNING 'Error processing invite for %: %', NEW.email, SQLERRM;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();