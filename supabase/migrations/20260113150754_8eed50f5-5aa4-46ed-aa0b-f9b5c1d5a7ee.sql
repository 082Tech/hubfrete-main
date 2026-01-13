
-- Update Usuarios to link auth_user_id and set cargo ADMIN for Vitor
UPDATE "Usuarios" 
SET auth_user_id = '69983f0a-44c6-43ea-87e2-4d1d9627c974', cargo = 'ADMIN'
WHERE id = 17;

-- Link Vitor to the same filial (id: 2) as Matheus with ADMIN cargo
INSERT INTO "Usuarios_Filiais" (usuario_id, filial_id, cargo_na_filial)
VALUES (17, 2, 'ADMIN')
ON CONFLICT DO NOTHING;

-- Also create embarcador record for Vitor linked to the same company
INSERT INTO embarcadores (user_id, razao_social, nome_fantasia, cnpj, email, ativo)
SELECT 
  '69983f0a-44c6-43ea-87e2-4d1d9627c974',
  razao_social,
  nome_fantasia,
  cnpj,
  'vitorvzp722@gmail.com',
  true
FROM embarcadores 
WHERE user_id = '535b9b9b-3541-496c-82b6-86e337470634'
ON CONFLICT DO NOTHING;

-- Add embarcador role for Vitor
INSERT INTO user_roles (user_id, role)
VALUES ('69983f0a-44c6-43ea-87e2-4d1d9627c974', 'embarcador')
ON CONFLICT DO NOTHING;
