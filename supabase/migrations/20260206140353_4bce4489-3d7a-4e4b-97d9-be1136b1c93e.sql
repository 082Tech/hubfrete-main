-- Add 'aguardando' to status_viagem enum
ALTER TYPE public.status_viagem ADD VALUE IF NOT EXISTS 'aguardando';