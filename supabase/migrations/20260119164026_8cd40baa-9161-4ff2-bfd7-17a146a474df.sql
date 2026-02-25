-- Enum para tipo de cadastro do motorista
CREATE TYPE public.tipo_cadastro_motorista AS ENUM ('autonomo', 'frota');

-- Enum para tipo de propriedade do veículo
CREATE TYPE public.tipo_propriedade_veiculo AS ENUM ('pf', 'pj');

-- Alterar tabela motoristas para adicionar novos campos
ALTER TABLE public.motoristas
ADD COLUMN tipo_cadastro tipo_cadastro_motorista DEFAULT 'frota',
ADD COLUMN uf VARCHAR(2),
ADD COLUMN cnh_digital_url TEXT,
ADD COLUMN cnh_tem_qrcode BOOLEAN DEFAULT false,
ADD COLUMN comprovante_endereco_url TEXT,
ADD COLUMN comprovante_endereco_titular_nome TEXT,
ADD COLUMN comprovante_endereco_titular_doc_url TEXT,
ADD COLUMN comprovante_vinculo_url TEXT,
ADD COLUMN possui_ajudante BOOLEAN DEFAULT false;

-- Tabela para referências do motorista (pessoais e comerciais)
CREATE TABLE public.motorista_referencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id UUID NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('pessoal', 'comercial')),
  ordem INTEGER NOT NULL DEFAULT 1,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  empresa TEXT,
  ramo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(motorista_id, tipo, ordem)
);

-- Enable RLS
ALTER TABLE public.motorista_referencias ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Allow all for authenticated" ON public.motorista_referencias
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabela para ajudantes
CREATE TABLE public.ajudantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id UUID NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  telefone TEXT,
  tipo_cadastro tipo_cadastro_motorista NOT NULL DEFAULT 'autonomo',
  comprovante_vinculo_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ajudantes ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Allow all for authenticated" ON public.ajudantes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Alterar tabela veiculos para adicionar novos campos de documentação
ALTER TABLE public.veiculos
ADD COLUMN tipo_propriedade tipo_propriedade_veiculo DEFAULT 'pf',
ADD COLUMN uf VARCHAR(2),
ADD COLUMN documento_veiculo_url TEXT,
ADD COLUMN antt_rntrc TEXT,
ADD COLUMN comprovante_endereco_proprietario_url TEXT,
ADD COLUMN proprietario_cpf_cnpj TEXT,
ADD COLUMN proprietario_nome TEXT;

-- Trigger para updated_at nas novas tabelas
CREATE TRIGGER update_motorista_referencias_updated_at
  BEFORE UPDATE ON public.motorista_referencias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_ajudantes_updated_at
  BEFORE UPDATE ON public.ajudantes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();