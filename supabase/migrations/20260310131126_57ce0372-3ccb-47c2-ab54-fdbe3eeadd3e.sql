-- Fill null/0 commission for embarcadores with 10%
UPDATE empresas SET comissao_hubfrete_percent = 10 WHERE comissao_hubfrete_percent IS NULL OR comissao_hubfrete_percent = 0;

-- Make column NOT NULL with default 10
ALTER TABLE empresas ALTER COLUMN comissao_hubfrete_percent SET DEFAULT 10;
ALTER TABLE empresas ALTER COLUMN comissao_hubfrete_percent SET NOT NULL;