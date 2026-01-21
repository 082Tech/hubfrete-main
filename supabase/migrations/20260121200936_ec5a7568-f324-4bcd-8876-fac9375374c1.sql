-- Adicionar valor 'cancelada' ao enum status_entrega
ALTER TYPE status_entrega ADD VALUE IF NOT EXISTS 'cancelada';