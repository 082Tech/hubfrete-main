-- Criar usuário embarcador ADMIN para Carajás
INSERT INTO usuarios (id, email, nome, cargo, motorista_autonomo, auth_user_id)
VALUES (
  (SELECT COALESCE(MAX(id), 0) + 1 FROM usuarios),
  'admin.embarcador@gmail.com',
  'Admin Embarcador Teste',
  'ADMIN',
  false,
  '0a5a70d0-b70a-45d7-9a01-5ab12a819cea'
);

-- Vincular à Matriz (filial 2) como ADMIN
INSERT INTO usuarios_filiais (id, usuario_id, filial_id, cargo_na_filial)
VALUES (
  (SELECT COALESCE(MAX(id), 0) + 1 FROM usuarios_filiais),
  (SELECT id FROM usuarios WHERE auth_user_id = '0a5a70d0-b70a-45d7-9a01-5ab12a819cea'),
  2,
  'ADMIN'
);

-- Vincular à Filial SP (filial 100) como ADMIN
INSERT INTO usuarios_filiais (id, usuario_id, filial_id, cargo_na_filial)
VALUES (
  (SELECT COALESCE(MAX(id), 0) + 2 FROM usuarios_filiais),
  (SELECT id FROM usuarios WHERE auth_user_id = '0a5a70d0-b70a-45d7-9a01-5ab12a819cea'),
  100,
  'ADMIN'
);

-- Adicionar role embarcador
INSERT INTO user_roles (user_id, role)
VALUES ('0a5a70d0-b70a-45d7-9a01-5ab12a819cea', 'embarcador')
ON CONFLICT (user_id, role) DO NOTHING;