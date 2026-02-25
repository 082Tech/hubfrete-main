-- Atualizar função para usar nomes corretos das colunas (inglês na tabela locations)
CREATE OR REPLACE FUNCTION public.sync_localizacoes_to_tracking_historico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  entrega_record RECORD;
  last_record RECORD;
  distance_meters FLOAT;
  time_diff_minutes FLOAT;
  should_insert BOOLEAN;
BEGIN
  -- Validação: precisa ter motorista_id
  IF NEW.motorista_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Loop em TODAS as entregas ATIVAS do motorista
  FOR entrega_record IN
    SELECT id, status
    FROM public.entregas
    WHERE motorista_id = NEW.motorista_id
      AND status IN ('aguardando', 'saiu_para_coleta', 'saiu_para_entrega', 'problema')
  LOOP
    -- Reset flag para cada entrega
    should_insert := FALSE;

    -- Buscar último ponto salvo para ESTA entrega específica
    SELECT latitude, longitude, created_at
    INTO last_record
    FROM public.tracking_historico
    WHERE entrega_id = entrega_record.id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Caso 1: Primeiro registro desta entrega
    IF last_record IS NULL THEN
      should_insert := TRUE;
    ELSE
      -- Caso 2: Calcular distância usando Haversine (em metros)
      distance_meters := 2 * 6371000 * asin(sqrt(
        power(sin(radians((NEW.latitude - last_record.latitude) / 2)), 2) +
        cos(radians(last_record.latitude)) * 
        cos(radians(NEW.latitude)) * 
        power(sin(radians((NEW.longitude - last_record.longitude) / 2)), 2)
      ));

      -- Caso 3: Calcular diferença de tempo (em minutos)
      time_diff_minutes := EXTRACT(EPOCH FROM (now() - last_record.created_at)) / 60.0;

      -- Salvar se: distância > 50m OU tempo > 5 minutos
      IF distance_meters > 50 OR time_diff_minutes > 5 THEN
        should_insert := TRUE;
      END IF;
    END IF;

    -- Inserir no histórico se as condições forem atendidas
    IF should_insert THEN
      INSERT INTO public.tracking_historico (
        entrega_id,
        latitude,
        longitude,
        altitude,
        velocidade,
        bussola_pos,
        precisao,
        status,
        created_at
      )
      VALUES (
        entrega_record.id,
        NEW.latitude,
        NEW.longitude,
        NEW.altitude,
        NEW.speed,      -- locations.speed → tracking_historico.velocidade
        NEW.heading,    -- locations.heading → tracking_historico.bussola_pos
        NEW.accuracy,   -- locations.accuracy → tracking_historico.precisao
        entrega_record.status,
        now()           -- timestamp calculado automaticamente
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Garantir que o trigger está ativo para INSERT e UPDATE
DROP TRIGGER IF EXISTS trigger_sync_localizacoes_historico ON public.locations;
CREATE TRIGGER trigger_sync_localizacoes_historico
AFTER INSERT OR UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.sync_localizacoes_to_tracking_historico();