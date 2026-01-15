-- Criar empresa transportadora de teste
INSERT INTO public.empresas (id, nome, cnpj_matriz, tipo, classe, created_at)
VALUES (999, 'TransportadoraX', '99.999.999/0001-99', 'TRANSPORTADORA', 'COMÉRCIO', NOW())
ON CONFLICT (id) DO NOTHING;

-- Criar filial matriz para a transportadora
INSERT INTO public.filiais (id, empresa_id, nome, cnpj, cidade, estado, is_matriz, ativa, created_at)
VALUES (999, 999, 'Matriz TransportadoraX', '99.999.999/0001-99', 'São Paulo', 'SP', true, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Criar usuário admin da transportadora
INSERT INTO public.usuarios (id, email, nome, cargo, motorista_autonomo, created_at)
VALUES (999, 'admin.transportadorax@teste.com', 'Admin TransportadoraX', 'ADMIN', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Linkar usuário à filial
INSERT INTO public.usuarios_filiais (id, usuario_id, filial_id, cargo_na_filial, created_at)
VALUES (999, 999, 999, 'ADMIN', NOW())
ON CONFLICT (id) DO NOTHING;

-- Associar os motoristas existentes à TransportadoraX
UPDATE public.motoristas 
SET empresa_id = 999 
WHERE id IN ('e0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000003');

-- Associar os veículos existentes à TransportadoraX
UPDATE public.veiculos 
SET empresa_id = 999 
WHERE motorista_id IN ('e0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000003');