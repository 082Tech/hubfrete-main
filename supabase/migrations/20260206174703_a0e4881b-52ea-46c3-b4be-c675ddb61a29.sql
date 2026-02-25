-- Add 'terceirizado' to tipo_cadastro_motorista enum
ALTER TYPE public.tipo_cadastro_motorista ADD VALUE IF NOT EXISTS 'terceirizado';