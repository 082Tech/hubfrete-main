-- Update empresa TransportadoraX to Paleteria Alagoana
UPDATE empresas 
SET nome = 'PALETERIA ALAGOANA LTDA', 
    cnpj_matriz = '43.761.581/0001-97',
    classe = 'COMÉRCIO'
WHERE id = 999;

-- Update filial matriz with real address data
UPDATE filiais 
SET nome = 'PALETERIA ALAGOANA',
    cnpj = '43.761.581/0001-97',
    endereco = 'AVENIDA GALBA NOVAES DE CASTRO, 320 - GALPAO0-6',
    cidade = 'MACEIO',
    estado = 'AL',
    cep = '57062-590',
    email = 'alvaro.netto@centralpallet.net.br',
    telefone = '(82) 9101-1441',
    responsavel = 'ALVARO MENDONCA ALVES NETTO',
    latitude = -9.6498,
    longitude = -35.7089
WHERE id = 999;