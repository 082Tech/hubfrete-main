
-- Update usuario with auth_user_id and upgrade to ADMIN
UPDATE usuarios 
SET auth_user_id = 'e114fef9-2779-417e-b28d-d69abc92868c',
    cargo = 'ADMIN',
    nome = 'Álvaro Netto'
WHERE id = 19;

-- Link to Paleteria Alagoana filial (999) as ADMIN
INSERT INTO usuarios_filiais (id, usuario_id, filial_id, cargo_na_filial)
VALUES (
  (SELECT COALESCE(MAX(id), 0) + 1 FROM usuarios_filiais),
  19,
  999,
  'ADMIN'
);

-- Add transportadora role to user_roles
INSERT INTO user_roles (user_id, role)
VALUES ('e114fef9-2779-417e-b28d-d69abc92868c', 'transportadora')
ON CONFLICT (user_id, role) DO NOTHING;
