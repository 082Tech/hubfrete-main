-- 1. Criar a Empresa
INSERT INTO public."Empresas" (tipo, classe)
VALUES ('EMBARCADOR', 'INDÚSTRIA');

-- 2. Criar a Filial da empresa
INSERT INTO public."Filiais" (empresa_id, nome, cnpj)
VALUES (
  (SELECT id FROM public."Empresas" WHERE tipo = 'EMBARCADOR' ORDER BY created_at DESC LIMIT 1),
  'HubFrete - Matriz',
  '12.345.678/0001-90'
);

-- 3. Criar o Embarcador vinculado ao user_id do auth.users
INSERT INTO public.embarcadores (user_id, cnpj, razao_social, nome_fantasia, email)
VALUES (
  '535b9b9b-3541-496c-82b6-86e337470634',
  '12.345.678/0001-90',
  'HubFrete Logística Ltda',
  'HubFrete',
  'matheuspedrosa2002@gmail.com'
);

-- 4. Adicionar role de embarcador ao usuário
INSERT INTO public.user_roles (user_id, role)
VALUES ('535b9b9b-3541-496c-82b6-86e337470634', 'embarcador')
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Atualizar o Usuario existente para vincular ao auth_user_id e cargo ADMIN
UPDATE public."Usuarios"
SET auth_user_id = '535b9b9b-3541-496c-82b6-86e337470634',
    cargo = 'ADMIN',
    nome = 'Matheus Pedrosa'
WHERE id = 18;

-- 6. Vincular o Usuario à Filial
INSERT INTO public."Usuarios_Filiais" (usuario_id, filial_id, cargo_na_filial)
VALUES (
  18,
  (SELECT id FROM public."Filiais" ORDER BY created_at DESC LIMIT 1),
  'ADMIN'
);