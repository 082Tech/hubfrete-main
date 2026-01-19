-- PASSO 1: Remover referências FK de cargas para endereços (para cargas que serão mantidas também, temporariamente)
UPDATE public.cargas 
SET endereco_origem_id = NULL, endereco_destino_id = NULL;

-- PASSO 2: Deletar TODOS os enderecos_carga vinculados a cargas que serão deletadas
DELETE FROM public.enderecos_carga
WHERE carga_id NOT IN (
  '0fa6d5fb-1267-4454-b08d-e59eff8dc9bc',
  'd9e91256-3348-44bf-a797-14ca7a8391fa', 
  '8e6cd85b-41ce-45f9-b367-1eed2bfaa3ec',
  'a2912f8f-e841-4d2e-b01c-69e4ddc853c9',
  'b0000001-0000-0000-0000-000000000001'
) AND carga_id IS NOT NULL;

-- PASSO 3: Deletar entregas órfãs
DELETE FROM public.entregas 
WHERE carga_id NOT IN (
  '0fa6d5fb-1267-4454-b08d-e59eff8dc9bc',
  'd9e91256-3348-44bf-a797-14ca7a8391fa', 
  '8e6cd85b-41ce-45f9-b367-1eed2bfaa3ec',
  'a2912f8f-e841-4d2e-b01c-69e4ddc853c9',
  'b0000001-0000-0000-0000-000000000001'
);

-- PASSO 4: Deletar cargas (mantendo apenas as 5 primeiras da Carajás)
DELETE FROM public.cargas 
WHERE id NOT IN (
  '0fa6d5fb-1267-4454-b08d-e59eff8dc9bc',
  'd9e91256-3348-44bf-a797-14ca7a8391fa', 
  '8e6cd85b-41ce-45f9-b367-1eed2bfaa3ec',
  'a2912f8f-e841-4d2e-b01c-69e4ddc853c9',
  'b0000001-0000-0000-0000-000000000001'
);

-- PASSO 5: Atualizar as 5 cargas restantes para status 'publicada' 
UPDATE public.cargas SET status = 'publicada';

-- PASSO 6: Criar novo enum com apenas 3 status
CREATE TYPE public.status_carga_new AS ENUM ('publicada', 'parcialmente_alocada', 'totalmente_alocada');

-- PASSO 7: Alterar coluna para usar novo enum
ALTER TABLE public.cargas 
ALTER COLUMN status DROP DEFAULT,
ALTER COLUMN status TYPE status_carga_new USING 'publicada'::status_carga_new,
ALTER COLUMN status SET DEFAULT 'publicada'::status_carga_new;

-- PASSO 8: Dropar enum antigo
DROP TYPE public.status_carga;

-- PASSO 9: Renomear novo enum para o nome original
ALTER TYPE public.status_carga_new RENAME TO status_carga;