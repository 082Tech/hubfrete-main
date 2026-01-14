
-- Atualizar coordenadas dos endereços baseado nas localizações reais

-- Av. Paulista, São Paulo (coordenadas reais do endereço)
UPDATE enderecos_carga SET latitude = -23.5615, longitude = -46.6559 
WHERE logradouro LIKE '%Paulista%' AND cidade = 'São Paulo' AND latitude IS NULL;

-- Av. Atlântica, Copacabana, Rio de Janeiro
UPDATE enderecos_carga SET latitude = -22.9714, longitude = -43.1822 
WHERE logradouro LIKE '%Atlântica%' AND cidade = 'Rio de Janeiro' AND latitude IS NULL;

-- Santos - Rua Principal
UPDATE enderecos_carga SET latitude = -23.9608, longitude = -46.3336 
WHERE cidade = 'Santos' AND latitude IS NULL;

-- Campinas - Rua das Flores
UPDATE enderecos_carga SET latitude = -22.9064, longitude = -47.0616 
WHERE cidade = 'Campinas' AND latitude IS NULL;

-- Curitiba - Rua dos Mecânicos
UPDATE enderecos_carga SET latitude = -25.4290, longitude = -49.2671 
WHERE cidade = 'Curitiba' AND latitude IS NULL;

-- Belém - Rua do Comércio e Rua das Frutas
UPDATE enderecos_carga SET latitude = -1.4558, longitude = -48.4902 
WHERE cidade = 'Belém' AND latitude IS NULL;

-- Marabá - Av. Principal e Rua das Minas
UPDATE enderecos_carga SET latitude = -5.3687, longitude = -49.1178 
WHERE cidade = 'Marabá' AND latitude IS NULL;

-- Parauapebas - Rod. PA-275 e Mercado Central
UPDATE enderecos_carga SET latitude = -6.0652, longitude = -49.9037 
WHERE cidade = 'Parauapebas' AND latitude IS NULL;

-- Barcarena - Porto de Barcarena
UPDATE enderecos_carga SET latitude = -1.5096, longitude = -48.6256 
WHERE cidade = 'Barcarena' AND latitude IS NULL;

-- São Luís - Av. Central
UPDATE enderecos_carga SET latitude = -2.5387, longitude = -44.2826 
WHERE cidade = 'São Luís' AND latitude IS NULL;

-- São Paulo - Av. Industrial (região industrial)
UPDATE enderecos_carga SET latitude = -23.5475, longitude = -46.6361 
WHERE cidade = 'São Paulo' AND logradouro LIKE '%Industrial%' AND latitude IS NULL;
