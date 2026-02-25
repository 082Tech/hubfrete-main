-- Criar empresa Esmalglass do Brasil (ID 1001)
INSERT INTO public.empresas (id, tipo, classe, cnpj_matriz, nome, logo_url)
VALUES (
  1001,
  'EMBARCADOR',
  'INDÚSTRIA',
  '86981966000172',
  'Esmalglass do Brasil',
  'https://www.esmalglass-itaca.com/sites/default/files/logo-esmalglass-itaca.png'
);

-- Criar filial matriz
INSERT INTO public.filiais (
  empresa_id,
  is_matriz,
  nome,
  cnpj,
  endereco,
  cidade,
  estado,
  cep,
  telefone,
  email,
  responsavel,
  ativa
)
VALUES (
  1001,
  true,
  'Matriz - Morro da Fumaça',
  '86981966000172',
  'Rodovia SC 108 - KM 365,95, S/N, Rodovia SC 108',
  'Morro da Fumaça',
  'SC',
  '88830000',
  '(48) 3431-5000',
  'contato@esmalglass-itaca.com',
  'João Batista Borgert',
  true
);

-- Criar usuários no auth usando a função auxiliar
DO $$
DECLARE
  user1_id UUID;
  user2_id UUID;
  filial_matriz_id BIGINT;
  usuario1_id BIGINT;
  usuario2_id BIGINT;
BEGIN
  -- Buscar ID da filial matriz
  SELECT id INTO filial_matriz_id FROM filiais WHERE empresa_id = 1001 AND is_matriz = true LIMIT 1;

  -- Criar usuário 1: yuri.silva@esmalglass-itaca.com
  user1_id := insert_user_to_auth('yuri.silva@esmalglass-itaca.com', '123456');
  
  -- Criar usuário 2: adryele.nascimento@altadiagroup.com  
  user2_id := insert_user_to_auth('adryele.nascimento@altadiagroup.com', '123456');

  -- Inserir roles de embarcador
  INSERT INTO user_roles (user_id, role) VALUES (user1_id, 'embarcador');
  INSERT INTO user_roles (user_id, role) VALUES (user2_id, 'embarcador');

  -- Criar registros em usuarios
  INSERT INTO usuarios (email, nome, cargo, motorista_autonomo, auth_user_id)
  VALUES ('yuri.silva@esmalglass-itaca.com', 'Yuri Silva', 'ADMIN', false, user1_id)
  RETURNING id INTO usuario1_id;
  
  INSERT INTO usuarios (email, nome, cargo, motorista_autonomo, auth_user_id)
  VALUES ('adryele.nascimento@altadiagroup.com', 'Adryele Nascimento', 'ADMIN', false, user2_id)
  RETURNING id INTO usuario2_id;

  -- Vincular usuários à filial matriz
  INSERT INTO usuarios_filiais (usuario_id, filial_id, cargo_na_filial)
  VALUES (usuario1_id, filial_matriz_id, 'ADMIN');
  
  INSERT INTO usuarios_filiais (usuario_id, filial_id, cargo_na_filial)
  VALUES (usuario2_id, filial_matriz_id, 'ADMIN');
END $$;