DO $$
DECLARE
  v_rec RECORD;
  i INT;
  n_pts INT := 50;
  frac NUMERIC;
  progress_max NUMERIC;
  lat NUMERIC;
  lng NUMERIC;
  ts TIMESTAMPTZ;
  duration_secs NUMERIC;
  speed_val NUMERIC;
  heading_val NUMERIC;
  status_val status_entrega;
BEGIN
  FOR v_rec IN
    SELECT v.id, v.codigo, v.status, v.started_at, v.ended_at, v.motorista_id,
      (SELECT eo.latitude FROM viagem_entregas ve JOIN entregas e ON e.id = ve.entrega_id JOIN cargas c ON c.id = e.carga_id JOIN enderecos_carga eo ON eo.id = c.endereco_origem_id WHERE ve.viagem_id = v.id LIMIT 1) AS lat_o,
      (SELECT eo.longitude FROM viagem_entregas ve JOIN entregas e ON e.id = ve.entrega_id JOIN cargas c ON c.id = e.carga_id JOIN enderecos_carga eo ON eo.id = c.endereco_origem_id WHERE ve.viagem_id = v.id LIMIT 1) AS lng_o,
      (SELECT ed.latitude FROM viagem_entregas ve JOIN entregas e ON e.id = ve.entrega_id JOIN cargas c ON c.id = e.carga_id JOIN enderecos_carga ed ON ed.id = c.endereco_destino_id WHERE ve.viagem_id = v.id LIMIT 1) AS lat_d,
      (SELECT ed.longitude FROM viagem_entregas ve JOIN entregas e ON e.id = ve.entrega_id JOIN cargas c ON c.id = e.carga_id JOIN enderecos_carga ed ON ed.id = c.endereco_destino_id WHERE ve.viagem_id = v.id LIMIT 1) AS lng_d
    FROM viagens v
    JOIN viagem_entregas ve ON ve.viagem_id = v.id
    JOIN entregas e ON e.id = ve.entrega_id
    JOIN cargas c ON c.id = e.carga_id
    WHERE c.empresa_id = 9
    GROUP BY v.id
  LOOP
    DELETE FROM tracking_historico WHERE viagem_id = v_rec.id;

    IF v_rec.status = 'finalizada' THEN
      progress_max := 1.0;
      duration_secs := EXTRACT(EPOCH FROM (v_rec.ended_at - v_rec.started_at));
    ELSE
      progress_max := 0.7;
      duration_secs := EXTRACT(EPOCH FROM (NOW() - v_rec.started_at));
    END IF;

    heading_val := (DEGREES(ATAN2(v_rec.lng_d - v_rec.lng_o, v_rec.lat_d - v_rec.lat_o))::NUMERIC + 360) % 360;

    FOR i IN 0..n_pts LOOP
      frac := (i::NUMERIC / n_pts::NUMERIC) * progress_max;
      lat := v_rec.lat_o + (v_rec.lat_d - v_rec.lat_o) * frac + (random() - 0.5) * 0.005;
      lng := v_rec.lng_o + (v_rec.lng_d - v_rec.lng_o) * frac + (random() - 0.5) * 0.005;
      ts := v_rec.started_at + (duration_secs * (i::NUMERIC / n_pts::NUMERIC)) * INTERVAL '1 second';
      speed_val := 60 + (random() * 40);

      IF i <= 1 THEN
        status_val := 'saiu_para_coleta'::status_entrega;
      ELSIF v_rec.status = 'finalizada' AND i >= n_pts - 1 THEN
        status_val := 'entregue'::status_entrega;
      ELSIF i > n_pts * 0.7 THEN
        status_val := 'saiu_para_entrega'::status_entrega;
      ELSE
        status_val := 'em_transito'::status_entrega;
      END IF;

      INSERT INTO tracking_historico (viagem_id, latitude, longitude, status, tracked_at, speed, heading, observacao)
      VALUES (v_rec.id, lat, lng, status_val, ts, speed_val, heading_val, NULL);
    END LOOP;

    IF v_rec.status = 'em_andamento' AND v_rec.motorista_id IS NOT NULL THEN
      frac := progress_max;
      lat := v_rec.lat_o + (v_rec.lat_d - v_rec.lat_o) * frac;
      lng := v_rec.lng_o + (v_rec.lng_d - v_rec.lng_o) * frac;

      DELETE FROM locations WHERE motorista_id = v_rec.motorista_id;
      INSERT INTO locations (motorista_id, viagem_id, latitude, longitude, updated_at, accuracy, speed, heading, gps_quality)
      VALUES (v_rec.motorista_id, v_rec.id, lat, lng, NOW() - INTERVAL '30 seconds', 10, 75, heading_val, 3);
    END IF;
  END LOOP;
END $$;