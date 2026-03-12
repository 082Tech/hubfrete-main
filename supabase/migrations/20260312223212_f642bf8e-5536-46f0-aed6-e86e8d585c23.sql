-- Fix cargas: change empresa_id from Paleteria Alagoana (999) to HubFrete (2)
UPDATE cargas SET empresa_id = 2 WHERE empresa_id = 999;

-- Fix financeiro_entregas: update empresa_embarcadora_id
UPDATE financeiro_entregas SET empresa_embarcadora_id = 2 WHERE empresa_embarcadora_id = 999;

-- Reassign fatura_embarcador_id from Paleteria faturas to HubFrete faturas
-- Fev Q2: 39421592... -> 71eefc75...
UPDATE financeiro_entregas 
SET fatura_embarcador_id = '71eefc75-15b3-436e-8964-2a673f528932'
WHERE fatura_embarcador_id = '39421592-8db4-4588-884e-fd05a250b7d3';

-- Mar Q1: 9cfa2ef0... -> bd86cda5...
UPDATE financeiro_entregas 
SET fatura_embarcador_id = 'bd86cda5-a591-44da-b6d8-b5ad16a0e6dd'
WHERE fatura_embarcador_id = '9cfa2ef0-69dd-4f30-8dbc-73efbd68f376';

-- Delete orphaned a_receber faturas from Paleteria Alagoana
DELETE FROM faturas WHERE id IN ('39421592-8db4-4588-884e-fd05a250b7d3', '9cfa2ef0-69dd-4f30-8dbc-73efbd68f376')