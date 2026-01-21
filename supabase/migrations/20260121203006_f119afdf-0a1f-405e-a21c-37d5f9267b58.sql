-- Criar registro em usuarios para o embarcador.central@gmail.com
INSERT INTO usuarios (auth_user_id, email, nome, cargo, motorista_autonomo)
VALUES ('550020e5-9f68-4cf2-b04e-c37e7bcfe20f', 'embarcador.central@gmail.com', 'Usuário Central Pallet', 'ADMIN', false)
RETURNING id;

-- Vincular à filial da Central Pallet (ID 1000) como ADMIN
INSERT INTO usuarios_filiais (usuario_id, filial_id, cargo_na_filial)
SELECT u.id, 1000, 'ADMIN'
FROM usuarios u
WHERE u.auth_user_id = '550020e5-9f68-4cf2-b04e-c37e7bcfe20f';

-- Adicionar role de embarcador
INSERT INTO user_roles (user_id, role)
VALUES ('550020e5-9f68-4cf2-b04e-c37e7bcfe20f', 'embarcador')
ON CONFLICT (user_id, role) DO NOTHING;