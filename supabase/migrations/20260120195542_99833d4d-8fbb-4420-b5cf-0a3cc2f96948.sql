-- 1. Remove Luis from current filial (HubFrete Matriz)
DELETE FROM public.usuarios_filiais WHERE usuario_id = 25;

-- 2. Remove his embarcador role
DELETE FROM public.user_roles WHERE user_id = '3f2652a4-e7a3-4ca7-8cfd-ce00b4aafef5';

-- 3. Add Luis to Paleteria Alagoana (filial_id = 999)
INSERT INTO public.usuarios_filiais (usuario_id, filial_id, cargo_na_filial)
VALUES (25, 999, 'ADMIN');

-- 4. Add transportadora role
INSERT INTO public.user_roles (user_id, role)
VALUES ('3f2652a4-e7a3-4ca7-8cfd-ce00b4aafef5', 'transportadora'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;