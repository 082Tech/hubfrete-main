
-- 1. Remove vínculo da entrega com a viagem finalizada
DELETE FROM viagem_entregas 
WHERE entrega_id = '04a2ecef-92a3-4476-b995-c788f8e41b57' 
  AND viagem_id = '787aa089-0d47-4dd6-a1ba-2334ca7ee2f7';

-- 2. Criar nova viagem (código VGM gerado pelo trigger)
-- 3. Vincular entrega à nova viagem
DO $$
DECLARE
  v_new_viagem_id UUID;
BEGIN
  INSERT INTO viagens (motorista_id, veiculo_id, carroceria_id, status, codigo, started_at)
  VALUES (
    '6f49498a-3b61-473a-a91e-45e608df6335',
    '3d2203e9-5554-49cb-b837-097809593725',
    'ac01cb38-bde9-430f-a28b-5a11e1748d62',
    'aguardando',
    '',
    NOW()
  )
  RETURNING id INTO v_new_viagem_id;

  INSERT INTO viagem_entregas (viagem_id, entrega_id, ordem)
  VALUES (v_new_viagem_id, '04a2ecef-92a3-4476-b995-c788f8e41b57', 1);
END $$;
