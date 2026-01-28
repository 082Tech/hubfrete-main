-- Atualizar logo da empresa
UPDATE public.empresas 
SET logo_url = 'https://b2bindustry.net/wp-content/uploads/ESMALGLASS-SPA-1x1-1.jpg'
WHERE id = 1001;

-- Criar Filial Nordeste
INSERT INTO public.filiais (
  empresa_id,
  is_matriz,
  nome,
  cnpj,
  endereco,
  cidade,
  estado,
  ativa
)
VALUES (
  1001,
  false,
  'Filial Nordeste',
  '86981966000334',
  'Rodovia Divaldo Suruagy',
  'Marechal Deodoro',
  'AL',
  true
);

-- Vincular usuários à Filial Nordeste
DO $$
DECLARE
  filial_nordeste_id BIGINT;
  usuario1_id BIGINT;
  usuario2_id BIGINT;
BEGIN
  -- Buscar ID da Filial Nordeste
  SELECT id INTO filial_nordeste_id FROM filiais WHERE empresa_id = 1001 AND cnpj = '86981966000334' LIMIT 1;

  -- Buscar IDs dos usuários
  SELECT id INTO usuario1_id FROM usuarios WHERE email = 'yuri.silva@esmalglass-itaca.com' LIMIT 1;
  SELECT id INTO usuario2_id FROM usuarios WHERE email = 'adryele.nascimento@altadiagroup.com' LIMIT 1;

  -- Vincular usuários à Filial Nordeste
  INSERT INTO usuarios_filiais (usuario_id, filial_id, cargo_na_filial)
  VALUES (usuario1_id, filial_nordeste_id, 'ADMIN');
  
  INSERT INTO usuarios_filiais (usuario_id, filial_id, cargo_na_filial)
  VALUES (usuario2_id, filial_nordeste_id, 'ADMIN');
END $$;