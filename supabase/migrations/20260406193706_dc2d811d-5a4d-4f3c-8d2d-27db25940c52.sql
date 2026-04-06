-- 1. Add 'expirada' to status_carga enum
ALTER TYPE status_carga ADD VALUE IF NOT EXISTS 'expirada';

-- 2. Create the expiration function
CREATE OR REPLACE FUNCTION public.expirar_cargas_vencidas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carga RECORD;
  v_count integer := 0;
  v_has_active_entregas boolean;
  v_new_status text;
BEGIN
  FOR v_carga IN
    SELECT id, codigo, status, peso_kg, peso_disponivel_kg
    FROM cargas
    WHERE status IN ('publicada', 'parcialmente_alocada')
      AND expira_em IS NOT NULL
      AND expira_em < now()
  LOOP
    -- Check if there are active (non-terminal) entregas
    SELECT EXISTS(
      SELECT 1 FROM entregas
      WHERE carga_id = v_carga.id
        AND status NOT IN ('aguardando', 'cancelada', 'problema')
    ) INTO v_has_active_entregas;

    -- Determine new status
    IF v_has_active_entregas THEN
      v_new_status := 'parcialmente_finalizada';
    ELSE
      v_new_status := 'expirada';
    END IF;

    -- Cancel pending entregas (status = 'aguardando') and restore weight
    UPDATE entregas
    SET status = 'cancelada',
        updated_at = now(),
        observacoes = COALESCE(observacoes || ' | ', '') || 'Cancelada automaticamente por expiração da carga'
    WHERE carga_id = v_carga.id
      AND status = 'aguardando';

    -- Restore peso_disponivel to full peso_kg if no active entregas remain
    IF NOT v_has_active_entregas THEN
      UPDATE cargas
      SET status = v_new_status::status_carga,
          peso_disponivel_kg = peso_kg,
          updated_at = now()
      WHERE id = v_carga.id;
    ELSE
      UPDATE cargas
      SET status = v_new_status::status_carga,
          updated_at = now()
      WHERE id = v_carga.id;
    END IF;

    -- Log the expiration event
    INSERT INTO carga_eventos (carga_id, tipo, observacao, timestamp)
    VALUES (
      v_carga.id,
      'oferta_expirada',
      'Oferta expirada automaticamente. Novo status: ' || v_new_status,
      now()
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 3. Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 4. Schedule the cron job to run every hour
SELECT cron.schedule(
  'expirar-cargas-vencidas',
  '0 * * * *',
  $$SELECT public.expirar_cargas_vencidas();$$
);