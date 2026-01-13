
-- 1. Fix database functions to use lowercase table names
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT f.empresa_id
  FROM usuarios u
  JOIN usuarios_filiais uf ON uf.usuario_id = u.id
  JOIN filiais f ON f.id = uf.filial_id
  WHERE u.auth_user_id = _user_id
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.get_user_filial_ids(_user_id uuid)
RETURNS SETOF bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT uf.filial_id
  FROM usuarios u
  JOIN usuarios_filiais uf ON uf.usuario_id = u.id
  WHERE u.auth_user_id = _user_id
$function$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_empresa(_user_id uuid, _empresa_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM usuarios u
    JOIN usuarios_filiais uf ON uf.usuario_id = u.id
    JOIN filiais f ON f.id = uf.filial_id
    WHERE u.auth_user_id = _user_id
      AND f.empresa_id = _empresa_id
  )
$function$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_filial(_user_id uuid, _filial_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM usuarios u
    JOIN usuarios_filiais uf ON uf.usuario_id = u.id
    WHERE u.auth_user_id = _user_id
      AND uf.filial_id = _filial_id
  )
$function$;

-- 2. Update handle_new_user to use lowercase and fix logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invite_record RECORD;
  new_usuario_id INTEGER;
BEGIN
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
    
    -- Create usuarios record (lowercase)
    INSERT INTO public.usuarios (email, nome, cargo, motorista_autonomo, auth_user_id)
    VALUES (
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1)),
      invite_record.role,
      false,
      NEW.id
    )
    RETURNING id INTO new_usuario_id;
    
    -- Link to filial if specified (lowercase)
    IF invite_record.filial_id IS NOT NULL THEN
      INSERT INTO public.usuarios_filiais (usuario_id, filial_id, cargo_na_filial)
      VALUES (new_usuario_id, invite_record.filial_id, invite_record.role);
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- 3. Create matriz filial for empresa 4 (transportadora that has no filiais)
INSERT INTO public.filiais (empresa_id, nome, is_matriz, ativa)
SELECT 4, 'Matriz', true, true
WHERE NOT EXISTS (SELECT 1 FROM filiais WHERE empresa_id = 4);

-- 4. Create a function to get empresa tipo by auth_user_id (useful for login)
CREATE OR REPLACE FUNCTION public.get_user_empresa_tipo(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT e.tipo::text
  FROM usuarios u
  JOIN usuarios_filiais uf ON uf.usuario_id = u.id
  JOIN filiais f ON f.id = uf.filial_id
  JOIN empresas e ON e.id = f.empresa_id
  WHERE u.auth_user_id = _user_id
  LIMIT 1
$function$;
