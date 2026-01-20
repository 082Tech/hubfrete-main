
-- Create usuario record for luis.sales@hubfrete.com
INSERT INTO public.usuarios (email, nome, cargo, motorista_autonomo, auth_user_id)
VALUES (
  'luis.sales@hubfrete.com',
  'Luis Sales',
  'ADMIN',
  false,
  '3f2652a4-e7a3-4ca7-8cfd-ce00b4aafef5'
);

-- Get the new usuario id and link to all Carajás filiais
INSERT INTO public.usuarios_filiais (usuario_id, filial_id, cargo_na_filial)
SELECT 
  (SELECT id FROM public.usuarios WHERE email = 'luis.sales@hubfrete.com'),
  f.id,
  'ADMIN'
FROM public.filiais f
WHERE f.empresa_id = 2 AND f.ativa = true;

-- Add user role for embarcador
INSERT INTO public.user_roles (user_id, role)
VALUES ('3f2652a4-e7a3-4ca7-8cfd-ce00b4aafef5', 'embarcador')
ON CONFLICT (user_id, role) DO NOTHING;
