-- Create usuarios and motoristas records for mototeste@hubfrete.com
DO $$
DECLARE
  v_user_id uuid := '0ec7e326-fe03-449e-8fb7-ede0df08d030';
BEGIN
  -- Create usuarios profile
  INSERT INTO public.usuarios (auth_user_id, email, nome, cargo, motorista_autonomo)
  VALUES (v_user_id, 'mototeste@hubfrete.com', 'Motorista Teste', NULL, true)
  ON CONFLICT DO NOTHING;

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
    'Motorista Teste',
    '987.654.321-00',
    '98765432100',
    'E',
    '2027-12-31',
    '(11) 98888-7777',
    'mototeste@hubfrete.com',
    'autonomo',
    true
  )
  ON CONFLICT DO NOTHING;

  -- Assign motorista role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'motorista')
  ON CONFLICT DO NOTHING;
END $$;