-- Tabela para armazenar Guias Nacionais de Recolhimento de Tributos Estaduais (GNRE)
CREATE TABLE IF NOT EXISTS public.gnres (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- CHAVES CORRIGIDAS (Tipos baseados em public.empresas, public.cargas e public.nfes no types.ts)
    empresa_id BIGINT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    cargas_id UUID REFERENCES public.cargas(id) ON DELETE SET NULL,
    nfe_id UUID REFERENCES public.nfes(id) ON DELETE CASCADE,
    
    -- Status do processamento
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (
        status IN (
            'pendente',
            'processando',
            'autorizada',
            'rejeitada'
        )
    ),
    -- Dados da Guia
    uf_favorecida VARCHAR(2) NOT NULL,
    receita VARCHAR(10) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_vencimento DATE NOT NULL,
    -- Retornos do WebService
    numero_recibo VARCHAR(50),
    codigo_barras VARCHAR(100),
    linha_digitavel VARCHAR(100),
    xml_envio TEXT,
    xml_retorno TEXT,
    motivo_rejeicao TEXT
);

-- Ativar RLS
ALTER TABLE public.gnres ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para GNREs
CREATE POLICY "Empresas podem ver e gerenciar suas próprias GNREs"
    ON public.gnres
    FOR ALL
    TO authenticated
    USING (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1))
    WITH CHECK (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1));

-- Admin (Torre de Controle) pode ver tudo
CREATE POLICY "Torre de Controle pode ver todas as GNREs"
    ON public.gnres
    FOR SELECT
    TO authenticated
    USING ((SELECT cargo FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1) = 'ADMIN');

-- Tabela para armazenar de forma segura o Certificado Digital A1 da Empresa
CREATE TABLE IF NOT EXISTS public.certificados_digitais (
    empresa_id BIGINT PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Dados sensíveis do certificado
    nome_titular TEXT,
    cnpj_titular VARCHAR(14),
    data_validade DATE,
    pfx_base64 TEXT NOT NULL,
    senha_encriptada TEXT NOT NULL -- ATENÇÃO: Num ambiente de prod ideal, isso ficaria no Supabase Vault
);

-- Ativar RLS
ALTER TABLE public.certificados_digitais ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Certificados Digitais
CREATE POLICY "Apenas ADMINs da empresa podem ver e atualizar o certificado"
    ON public.certificados_digitais
    FOR ALL
    TO authenticated
    USING (
        empresa_id = (SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1) AND
        (SELECT cargo FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1) = 'ADMIN'
    )
    WITH CHECK (
        empresa_id = (SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1) AND
        (SELECT cargo FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1) = 'ADMIN'
    );