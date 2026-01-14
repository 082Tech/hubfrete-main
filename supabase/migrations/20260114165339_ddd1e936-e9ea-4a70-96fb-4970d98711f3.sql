-- Update Matriz (Parauapebas - PA, região de Carajás)
UPDATE filiais SET 
  nome = 'Matriz',
  endereco = 'Av. dos Portugueses, 300',
  cidade = 'Parauapebas',
  estado = 'PA',
  cep = '68515-000',
  telefone = '(94) 3346-5000',
  email = 'matriz@carajas.com.br',
  responsavel = 'João Silva',
  latitude = -6.0679,
  longitude = -49.9037
WHERE id = 2;

-- Update Filial SP (São Paulo)
UPDATE filiais SET 
  nome = 'Filial SP',
  endereco = 'Av. Paulista, 1000',
  cidade = 'São Paulo',
  estado = 'SP',
  cep = '01310-100',
  telefone = '(11) 3456-7890',
  email = 'sp@carajas.com.br',
  responsavel = 'Maria Santos',
  latitude = -23.5614,
  longitude = -46.6558
WHERE id = 100;