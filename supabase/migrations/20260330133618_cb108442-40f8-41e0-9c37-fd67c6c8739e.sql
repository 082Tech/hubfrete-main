ALTER TABLE cargas
  ADD COLUMN agendamento_entrega boolean NOT NULL DEFAULT false,
  ADD COLUMN link_agendamento text;