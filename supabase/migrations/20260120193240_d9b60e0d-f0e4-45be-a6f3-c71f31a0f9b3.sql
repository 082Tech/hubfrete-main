
-- Create usuario record for ryan.robert@hubfrete.com
INSERT INTO public.usuarios (email, nome, cargo, motorista_autonomo, auth_user_id)
VALUES (
  'ryan.robert@hubfrete.com',
  'Ryan Robert',
  'ADMIN',
  false,
  '10e500d1-efd3-44a9-ae67-51fa149205f1'
);

-- Link to all Carajás filiais (empresa_id = 2)
INSERT INTO public.usuarios_filiais (usuario_id, filial_id, cargo_na_filial)
SELECT 
  (SELECT id FROM public.usuarios WHERE email = 'ryan.robert@hubfrete.com'),
  f.id,
  'ADMIN'
FROM public.filiais f
WHERE f.empresa_id = 2 AND f.ativa = true;

-- Add user role for embarcador
INSERT INTO public.user_roles (user_id, role)
VALUES ('10e500d1-efd3-44a9-ae67-51fa149205f1', 'embarcador')
ON CONFLICT (user_id, role) DO NOTHING;
