-- Create test autonomous driver
-- First, insert into auth.users using the helper function
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Create auth user
  v_user_id := extensions.uuid_generate_v4();
  
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    aud,
    role
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'motorista.teste@hubfrete.com',
    crypt('Teste123!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "João Motorista Teste"}'::jsonb,
    now(),
    now(),
    '',
    'authenticated',
    'authenticated'
  );

  -- Create usuarios profile
  INSERT INTO public.usuarios (auth_user_id, email, nome, cargo, motorista_autonomo)
  VALUES (v_user_id, 'motorista.teste@hubfrete.com', 'João Motorista Teste', NULL, true);

  -- Create motoristas record (autonomous - no empresa_id)
  INSERT INTO public.motoristas (
    user_id,
    nome_completo,
    cpf,
    cnh,
    categoria_cnh,
    validade_cnh,
    telefone,
    email,
    tipo_cadastro,
    ativo
  ) VALUES (
    v_user_id,
    'João Motorista Teste',
    '123.456.789-00',
    '12345678901',
    'E',
    '2027-12-31',
    '(11) 99999-8888',
    'motorista.teste@hubfrete.com',
    'autonomo',
    true
  );

  -- Assign motorista role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'motorista');
END $$;