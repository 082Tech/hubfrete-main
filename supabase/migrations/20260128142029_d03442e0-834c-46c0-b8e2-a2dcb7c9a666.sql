-- Create origin address for the test cargo
INSERT INTO enderecos_carga (
  carga_id,
  tipo,
  cep,
  logradouro,
  numero,
  bairro,
  cidade,
  estado,
  latitude,
  longitude,
  contato_nome,
  contato_telefone
) VALUES (
  'cf3c9317-d257-4732-b14c-59064c0195d5',
  'origem',
  '01310-100',
  'Avenida Paulista',
  '1000',
  'Bela Vista',
  'São Paulo',
  'SP',
  -23.5629,
  -46.6544,
  'Teste Origem',
  '11999999999'
);

-- Create destination address for the test cargo
INSERT INTO enderecos_carga (
  carga_id,
  tipo,
  cep,
  logradouro,
  numero,
  bairro,
  cidade,
  estado,
  latitude,
  longitude,
  contato_nome,
  contato_telefone
) VALUES (
  'cf3c9317-d257-4732-b14c-59064c0195d5',
  'destino',
  '22041-080',
  'Avenida Atlântica',
  '500',
  'Copacabana',
  'Rio de Janeiro',
  'RJ',
  -22.9714,
  -43.1823,
  'Teste Destino',
  '21999999999'
);

-- Update carga with address references
UPDATE cargas 
SET 
  endereco_origem_id = (SELECT id FROM enderecos_carga WHERE carga_id = 'cf3c9317-d257-4732-b14c-59064c0195d5' AND tipo = 'origem' LIMIT 1),
  endereco_destino_id = (SELECT id FROM enderecos_carga WHERE carga_id = 'cf3c9317-d257-4732-b14c-59064c0195d5' AND tipo = 'destino' LIMIT 1)
WHERE id = 'cf3c9317-d257-4732-b14c-59064c0195d5';

-- Create entrega assigned to Alvaro Teste
INSERT INTO entregas (
  carga_id,
  motorista_id,
  veiculo_id,
  carroceria_id,
  status,
  peso_alocado_kg,
  valor_frete
) VALUES (
  'cf3c9317-d257-4732-b14c-59064c0195d5',
  'c116a946-14c2-449b-a392-f238fabc9aac',
  'bdfcb964-aa6c-46a1-a243-43a41b863130',
  'fcb48b5a-c7ed-4a9a-bf09-4fb60ad257bc',
  'aguardando',
  15000,
  2250
);

-- Update carga status to fully allocated
UPDATE cargas
SET 
  status = 'totalmente_alocada',
  peso_disponivel_kg = 0
WHERE id = 'cf3c9317-d257-4732-b14c-59064c0195d5';