
-- 1. Vincular endereços existentes às cargas usando o carga_id como referência
-- Carga a2912f8f-e841-4d2e-b01c-69e4ddc853c9 (Eletrônicos) - já tem endereços
UPDATE cargas SET 
  endereco_origem_id = 'ddc9f278-c8cb-4fc2-ac9c-dd756b5b5b49',
  endereco_destino_id = '8f201107-0230-4cb1-81cd-3321c5d5826f'
WHERE id = 'a2912f8f-e841-4d2e-b01c-69e4ddc853c9';

-- Carga b0000001-0000-0000-0000-000000000001 (Minério de Cobre) - já tem endereços
UPDATE cargas SET 
  endereco_origem_id = '2aa107f3-3282-4396-9865-7966588e3ab7',
  endereco_destino_id = '0a42ced1-5a37-4d22-8bc8-294a4bf5dc46'
WHERE id = 'b0000001-0000-0000-0000-000000000001';

-- Carga 8e6cd85b-41ce-45f9-b367-1eed2bfaa3ec (Equipamentos industriais) - já tem endereços
UPDATE cargas SET 
  endereco_origem_id = 'fcf1d41e-ead3-4b74-bd23-599462f73a7d',
  endereco_destino_id = '7d6d3b3d-eb57-4c76-895b-af3f4cfce84d'
WHERE id = '8e6cd85b-41ce-45f9-b367-1eed2bfaa3ec';

-- 2. Criar endereços faltantes para as outras 2 cargas

-- Carga 0fa6d5fb-1267-4454-b08d-e59eff8dc9bc (Minério de ferro - Porto de Santos)
-- Origem: Parauapebas (Carajás)
INSERT INTO enderecos_carga (id, tipo, logradouro, numero, bairro, cidade, estado, cep, latitude, longitude, contato_nome, contato_telefone)
VALUES (
  'e0000001-0001-0001-0001-000000000001',
  'origem',
  'Estrada da Mina S6D',
  's/n',
  'Serra Sul',
  'Parauapebas',
  'PA',
  '68515-000',
  -6.0683,
  -50.0986,
  'Vale S.A. - Mina Carajás',
  '(94) 3327-4000'
);

-- Destino: Porto de Santos
INSERT INTO enderecos_carga (id, tipo, logradouro, numero, bairro, cidade, estado, cep, latitude, longitude, contato_nome, contato_telefone)
VALUES (
  'e0000001-0001-0001-0001-000000000002',
  'destino',
  'Av. Senador Dantas',
  '500',
  'Paquetá',
  'Santos',
  'SP',
  '11013-000',
  -23.9535,
  -46.3222,
  'Porto de Santos S.A.',
  '(13) 3202-6565'
);

UPDATE cargas SET 
  endereco_origem_id = 'e0000001-0001-0001-0001-000000000001',
  endereco_destino_id = 'e0000001-0001-0001-0001-000000000002'
WHERE id = '0fa6d5fb-1267-4454-b08d-e59eff8dc9bc';

-- Carga d9e91256-3348-44bf-a797-14ca7a8391fa (Refrigerada - Carrefour)
-- Origem: Parauapebas
INSERT INTO enderecos_carga (id, tipo, logradouro, numero, bairro, cidade, estado, cep, latitude, longitude, contato_nome, contato_telefone)
VALUES (
  'e0000001-0001-0001-0001-000000000003',
  'origem',
  'Rodovia PA-275',
  'Km 32',
  'Zona Industrial',
  'Parauapebas',
  'PA',
  '68515-000',
  -6.0650,
  -50.0800,
  'Frigorífico Carajás Ltda',
  '(94) 3346-7890'
);

-- Destino: Carrefour SP
INSERT INTO enderecos_carga (id, tipo, logradouro, numero, bairro, cidade, estado, cep, latitude, longitude, contato_nome, contato_telefone)
VALUES (
  'e0000001-0001-0001-0001-000000000004',
  'destino',
  'Av. Marginal Tietê',
  '1500',
  'Limão',
  'São Paulo',
  'SP',
  '02712-001',
  -23.5140,
  -46.6820,
  'Carrefour - CD São Paulo',
  '(11) 3779-4500'
);

UPDATE cargas SET 
  endereco_origem_id = 'e0000001-0001-0001-0001-000000000003',
  endereco_destino_id = 'e0000001-0001-0001-0001-000000000004'
WHERE id = 'd9e91256-3348-44bf-a797-14ca7a8391fa';

-- 3. Preencher destinatário faltante na carga de Eletrônicos
UPDATE cargas SET 
  destinatario_razao_social = 'Distribuidora Eletrônica Campinas Ltda',
  destinatario_nome_fantasia = 'Eletrônica Campinas',
  destinatario_cnpj = '12.345.678/0001-90',
  destinatario_contato_nome = 'Carlos Silva',
  destinatario_contato_telefone = '(19) 3242-5678'
WHERE id = 'a2912f8f-e841-4d2e-b01c-69e4ddc853c9';
