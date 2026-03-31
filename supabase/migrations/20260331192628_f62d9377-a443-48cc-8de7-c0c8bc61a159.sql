ALTER TABLE cargas
  ADD COLUMN IF NOT EXISTS agendamento_entrega boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_agendamento text;