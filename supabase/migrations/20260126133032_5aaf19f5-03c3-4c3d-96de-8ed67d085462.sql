-- Insert 2 vehicles for Costa Transportes (empresa_id = 5)
-- MVK0G52 already exists
INSERT INTO public.veiculos (empresa_id, placa, tipo, carroceria, marca, modelo, ativo)
VALUES 
  (5, 'MUW7403', 'truck', 'fechada_bau', 'Volkswagen', '24-250', true),
  (5, 'TCI8A90', 'toco', 'fechada_bau', 'Mercedes-Benz', '1719', true);