-- Fix the test cargo "Testee" - link addresses and generate code
UPDATE cargas 
SET 
  endereco_origem_id = 'fa198170-9097-48e4-8606-5ecacbd57145',
  endereco_destino_id = 'f9d3ad83-86d7-4031-ab7a-9612026f0ead',
  codigo = 'CRG-2026-0003'
WHERE id = '292d177b-f980-49da-984a-21517c776a2b';