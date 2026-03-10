-- Update financeiro_entregas records with 0 commission to 10%
UPDATE financeiro_entregas 
SET valor_comissao = valor_frete * 0.10, 
    valor_liquido = valor_frete * 0.90 
WHERE valor_comissao = 0;