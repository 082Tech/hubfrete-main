
-- Create enum for pricing type
CREATE TYPE public.tipo_precificacao AS ENUM ('por_tonelada', 'por_m3', 'fixo', 'por_km');

-- Add pricing type column with default to maintain backward compatibility
ALTER TABLE public.cargas
  ADD COLUMN tipo_precificacao public.tipo_precificacao NOT NULL DEFAULT 'por_tonelada';

-- Add new pricing columns
ALTER TABLE public.cargas
  ADD COLUMN valor_frete_m3 numeric NULL,
  ADD COLUMN valor_frete_fixo numeric NULL,
  ADD COLUMN valor_frete_km numeric NULL;

-- Set existing records that have valor_frete_tonelada to 'por_tonelada'
-- (already handled by default)
