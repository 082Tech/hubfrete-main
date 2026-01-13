-- Inserir carga de teste para o embarcador f4396acb-86fa-4e2d-9e41-347c14516ca0
INSERT INTO public.cargas (
  embarcador_id,
  descricao,
  tipo,
  peso_kg,
  volume_m3,
  quantidade,
  valor_mercadoria,
  data_coleta_de,
  data_coleta_ate,
  data_entrega_limite,
  status,
  carga_fragil,
  carga_perigosa,
  carga_viva,
  empilhavel,
  requer_refrigeracao,
  codigo
) VALUES (
  'f4396acb-86fa-4e2d-9e41-347c14516ca0',
  'Carga Teste - Eletrônicos diversos para distribuição',
  'carga_seca',
  1500,
  8.5,
  25,
  75000.00,
  CURRENT_DATE + INTERVAL '2 days',
  CURRENT_DATE + INTERVAL '4 days',
  CURRENT_DATE + INTERVAL '7 days',
  'publicada',
  true,
  false,
  false,
  true,
  false,
  'CRG-2026-0001'
)
RETURNING id;

-- Inserir endereço de origem
INSERT INTO public.enderecos_carga (
  carga_id,
  tipo,
  cep,
  logradouro,
  numero,
  bairro,
  cidade,
  estado,
  contato_nome,
  contato_telefone
)
SELECT 
  id,
  'origem',
  '01310-100',
  'Avenida Paulista',
  '1000',
  'Bela Vista',
  'São Paulo',
  'SP',
  'João Silva',
  '(11) 99999-1234'
FROM public.cargas 
WHERE codigo = 'CRG-2026-0001';

-- Inserir endereço de destino
INSERT INTO public.enderecos_carga (
  carga_id,
  tipo,
  cep,
  logradouro,
  numero,
  bairro,
  cidade,
  estado,
  contato_nome,
  contato_telefone
)
SELECT 
  id,
  'destino',
  '22041-080',
  'Avenida Atlântica',
  '2500',
  'Copacabana',
  'Rio de Janeiro',
  'RJ',
  'Maria Santos',
  '(21) 98888-5678'
FROM public.cargas 
WHERE codigo = 'CRG-2026-0001';