-- Insert the vehicle from CRLV document
INSERT INTO public.veiculos (
  placa,
  tipo,
  carroceria,
  marca,
  modelo,
  ano,
  renavam,
  uf,
  capacidade_kg,
  empresa_id,
  ativo,
  tipo_propriedade
) VALUES (
  'TNS9H77',
  'carreta',           -- Caminhão-Trator / Cavalo Mecânico
  'apenas_cavalo',     -- Tração (sem carroceria própria)
  'DAF',
  'XF FTS 480',
  2026,
  '01464400552',
  'AL',
  23000,              -- Peso bruto total 23.0 toneladas
  999,                -- Paleteria Alagoana
  true,
  'pj'                -- CNPJ 43.761.581/0001-97
) ON CONFLICT (placa) DO NOTHING;