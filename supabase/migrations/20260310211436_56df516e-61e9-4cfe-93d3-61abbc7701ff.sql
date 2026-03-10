
-- 1. ENUM: Add 'em_transito' to status_entrega
ALTER TYPE public.status_entrega ADD VALUE IF NOT EXISTS 'em_transito' AFTER 'saiu_para_coleta';
