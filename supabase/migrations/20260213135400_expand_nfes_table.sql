-- Migration: Expandir tabela nfes para suportar validação completa e extração de dados
-- Data: 2026-02-13
-- Descrição: Adiciona campos para status de validação, dados extraídos do XML e caminhos de armazenamento

ALTER TABLE public.nfes
  ADD COLUMN IF NOT EXISTS status_validacao TEXT DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS validado_em TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS erro_validacao TEXT,
  ADD COLUMN IF NOT EXISTS xml_path TEXT,
  ADD COLUMN IF NOT EXISTS ftp_path TEXT,
  ADD COLUMN IF NOT EXISTS remetente_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS remetente_razao_social TEXT,
  ADD COLUMN IF NOT EXISTS remetente_ie TEXT,
  ADD COLUMN IF NOT EXISTS destinatario_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS destinatario_razao_social TEXT,
  ADD COLUMN IF NOT EXISTS destinatario_ie TEXT,
  ADD COLUMN IF NOT EXISTS valor_total NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS peso_bruto NUMERIC(15,3),
  ADD COLUMN IF NOT EXISTS data_emissao TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS serie TEXT,
  ADD COLUMN IF NOT EXISTS modelo TEXT,
  ADD COLUMN IF NOT EXISTS natureza_operacao TEXT;

-- Comentários explicativos
COMMENT ON COLUMN public.nfes.status_validacao 
  IS 'Status da validação na SEFAZ: pendente, validando, autorizada, rejeitada, cancelada';
  
COMMENT ON COLUMN public.nfes.validado_em 
  IS 'Timestamp de quando a NF-e foi validada com sucesso na SEFAZ';
  
COMMENT ON COLUMN public.nfes.erro_validacao 
  IS 'Mensagem de erro caso a validação falhe';
  
COMMENT ON COLUMN public.nfes.xml_path 
  IS 'Caminho do arquivo XML no Supabase Storage (bucket: notas-fiscais)';
  
COMMENT ON COLUMN public.nfes.ftp_path 
  IS 'Caminho do arquivo XML no servidor FTP/VPS para backup';
  
COMMENT ON COLUMN public.nfes.remetente_cnpj 
  IS 'CNPJ do remetente extraído do XML';
  
COMMENT ON COLUMN public.nfes.remetente_razao_social 
  IS 'Razão social do remetente extraída do XML';
  
COMMENT ON COLUMN public.nfes.remetente_ie 
  IS 'Inscrição estadual do remetente extraída do XML';
  
COMMENT ON COLUMN public.nfes.destinatario_cnpj 
  IS 'CNPJ do destinatário extraído do XML';
  
COMMENT ON COLUMN public.nfes.destinatario_razao_social 
  IS 'Razão social do destinatário extraída do XML';
  
COMMENT ON COLUMN public.nfes.destinatario_ie 
  IS 'Inscrição estadual do destinatário extraída do XML';
  
COMMENT ON COLUMN public.nfes.valor_total 
  IS 'Valor total da NF-e extraído do XML (tag vNF)';
  
COMMENT ON COLUMN public.nfes.peso_bruto 
  IS 'Peso bruto total extraído do XML (tag pesoB)';
  
COMMENT ON COLUMN public.nfes.data_emissao 
  IS 'Data de emissão da NF-e extraída do XML (tag dhEmi)';
  
COMMENT ON COLUMN public.nfes.serie 
  IS 'Série da NF-e extraída do XML (tag serie)';
  
COMMENT ON COLUMN public.nfes.modelo 
  IS 'Modelo da NF-e extraído do XML (tag mod - geralmente 55)';
  
COMMENT ON COLUMN public.nfes.natureza_operacao 
  IS 'Natureza da operação extraída do XML (tag natOp)';

-- Criar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_nfes_status_validacao ON public.nfes(status_validacao);
CREATE INDEX IF NOT EXISTS idx_nfes_chave_acesso ON public.nfes(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_nfes_entrega_id ON public.nfes(entrega_id);
