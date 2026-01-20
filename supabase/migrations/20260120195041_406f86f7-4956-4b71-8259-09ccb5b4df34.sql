-- 1. Remove logo from HubFrete embarcador
UPDATE public.empresas 
SET logo_url = NULL 
WHERE id = 2;

-- 2. Create Central Pallet empresa (embarcador)
INSERT INTO public.empresas (id, nome, tipo, classe, cnpj_matriz, created_at)
VALUES (
  1000, 
  'CENTRAL COMERCIO DE PALLET LTDA', 
  'EMBARCADOR', 
  'COMÉRCIO', 
  '20664328000110',
  NOW()
);

-- 3. Create Central Pallet filial (matriz)
INSERT INTO public.filiais (id, empresa_id, nome, cnpj, is_matriz, ativa, cep, estado, cidade, endereco, telefone, created_at)
VALUES (
  1000,
  1000,
  'CENTRAL PALLET',
  '20664328000110',
  true,
  true,
  '57082890',
  'AL',
  'MACEIO',
  'AVENIDA AQUIDAUANA, 145, SANTA LUCIA',
  '8299227266',
  NOW()
);

-- 4. Remove Joseilde from current filial (Paleteria Alagoana)
DELETE FROM public.usuarios_filiais WHERE usuario_id = 28;

-- 5. Remove her transportadora role
DELETE FROM public.user_roles WHERE user_id = (SELECT auth_user_id FROM public.usuarios WHERE id = 28);

-- 6. Add Joseilde to Central Pallet
INSERT INTO public.usuarios_filiais (usuario_id, filial_id, cargo_na_filial)
VALUES (28, 1000, 'ADMIN');

-- 7. Add embarcador role
INSERT INTO public.user_roles (user_id, role)
SELECT auth_user_id, 'embarcador'::public.app_role
FROM public.usuarios 
WHERE id = 28
ON CONFLICT (user_id, role) DO NOTHING;