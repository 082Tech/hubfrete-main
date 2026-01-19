-- Inserir veículos (Caminhões Tratores) da Paleteria Alagoana
INSERT INTO veiculos (placa, tipo, carroceria, marca, modelo, ano, renavam, uf, empresa_id, ativo)
VALUES 
  ('TNH7B58', 'carreta', 'apenas_cavalo', 'DAF', 'XF FTB 530', 2024, '01414884939', 'AL', 999, true),
  ('TNS9H67', 'carreta', 'apenas_cavalo', 'DAF', 'XF FTS 480 SSC', 2025, '01464423218', 'AL', 999, true);

-- Inserir carrocerias (Semi-Reboques) da Paleteria Alagoana
INSERT INTO carrocerias (placa, tipo, marca, modelo, ano, renavam, empresa_id, ativo)
VALUES 
  ('RZZ3I45', 'bau', 'FACCHINI', 'SRF 4LO', 2023, '01346290218', 999, true),
  ('TNI3C09', 'bau', 'RANDON', 'SR FG LO 1ED3E', 2025, '01456283720', 999, true),
  ('TNTOB37', 'bau', 'RANDON', 'SR FG LO 1ED3E', 2025, '01455043238', 999, true);