
-- Migration 2: Structured address + IBGE code on filiais
ALTER TABLE public.filiais
  ADD COLUMN IF NOT EXISTS logradouro TEXT,
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS complemento TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS codigo_municipio_ibge TEXT;
