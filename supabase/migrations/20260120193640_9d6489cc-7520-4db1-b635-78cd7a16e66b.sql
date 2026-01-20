
-- Create usuario record for leandro.basto@hubfrete.com
INSERT INTO public.usuarios (email, nome, cargo, motorista_autonomo, auth_user_id)
VALUES (
  'leandro.basto@hubfrete.com',
  'Leandro Basto',
  'ADMIN',
  false,
  '76b5d8bd-26a3-4e1f-9635-63d687c4b28e'
);

-- Create usuario record for joseilde.pereira@hubfrete.com
INSERT INTO public.usuarios (email, nome, cargo, motorista_autonomo, auth_user_id)
VALUES (
  'joseilde.pereira@hubfrete.com',
  'Joseilde Pereira',
  'ADMIN',
  false,
  'e930a5ef-e0aa-48b4-a37d-2cfc0263884a'
);

-- Link leandro.basto to all Paleteria Alagoana filiais
INSERT INTO public.usuarios_filiais (usuario_id, filial_id, cargo_na_filial)
SELECT 
  (SELECT id FROM public.usuarios WHERE email = 'leandro.basto@hubfrete.com'),
  f.id,
  'ADMIN'
FROM public.filiais f
WHERE f.empresa_id = 999 AND f.ativa = true;

-- Link joseilde.pereira to all Paleteria Alagoana filiais
INSERT INTO public.usuarios_filiais (usuario_id, filial_id, cargo_na_filial)
SELECT 
  (SELECT id FROM public.usuarios WHERE email = 'joseilde.pereira@hubfrete.com'),
  f.id,
  'ADMIN'
FROM public.filiais f
WHERE f.empresa_id = 999 AND f.ativa = true;

-- Add user roles for transportadora
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('76b5d8bd-26a3-4e1f-9635-63d687c4b28e', 'transportadora'),
  ('e930a5ef-e0aa-48b4-a37d-2cfc0263884a', 'transportadora')
ON CONFLICT (user_id, role) DO NOTHING;
