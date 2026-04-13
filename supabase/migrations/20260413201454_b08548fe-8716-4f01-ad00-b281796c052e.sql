
-- A-C: Funções
CREATE OR REPLACE FUNCTION public.fn_audit_trigger() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_registro_id TEXT; v_usuario_id UUID; v_usuario_nome TEXT; v_registro_codigo TEXT; v_empresa_nome TEXT; v_descricao TEXT; v_dados_anteriores JSONB; v_dados_novos JSONB; v_emp_id BIGINT;
BEGIN
  v_usuario_id := auth.uid();
  IF TG_OP = 'DELETE' THEN v_registro_id := OLD.id::TEXT; v_dados_anteriores := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN v_registro_id := NEW.id::TEXT; v_dados_novos := to_jsonb(NEW);
  ELSE v_registro_id := NEW.id::TEXT; v_dados_anteriores := to_jsonb(OLD); v_dados_novos := to_jsonb(NEW); END IF;
  SELECT nome INTO v_usuario_nome FROM public.usuarios WHERE auth_user_id = v_usuario_id LIMIT 1;
  IF v_usuario_nome IS NULL THEN v_usuario_nome := 'Sistema'; END IF;
  IF v_dados_novos IS NOT NULL AND v_dados_novos ? 'codigo' THEN v_registro_codigo := v_dados_novos->>'codigo';
  ELSIF v_dados_anteriores IS NOT NULL AND v_dados_anteriores ? 'codigo' THEN v_registro_codigo := v_dados_anteriores->>'codigo'; END IF;
  IF v_dados_novos IS NOT NULL AND v_dados_novos ? 'empresa_id' THEN v_emp_id := (v_dados_novos->>'empresa_id')::BIGINT;
  ELSIF v_dados_anteriores IS NOT NULL AND v_dados_anteriores ? 'empresa_id' THEN v_emp_id := (v_dados_anteriores->>'empresa_id')::BIGINT; END IF;
  IF v_emp_id IS NOT NULL THEN SELECT COALESCE(nome_fantasia, nome, razao_social) INTO v_empresa_nome FROM public.empresas WHERE id = v_emp_id LIMIT 1; END IF;
  IF v_empresa_nome IS NULL AND TG_TABLE_NAME = 'entregas' THEN SELECT COALESCE(emp.nome_fantasia, emp.nome, emp.razao_social) INTO v_empresa_nome FROM public.cargas c JOIN public.empresas emp ON emp.id = c.empresa_id WHERE c.id = COALESCE(v_dados_novos->>'carga_id', v_dados_anteriores->>'carga_id')::UUID LIMIT 1; END IF;
  v_descricao := v_usuario_nome || ' ' || LOWER(TG_OP) || ' em ' || TG_TABLE_NAME;
  INSERT INTO public.auditoria_logs (tabela, operacao, registro_id, dados_anteriores, dados_novos, usuario_id, usuario_nome, registro_codigo, empresa_nome, descricao) VALUES (TG_TABLE_NAME, TG_OP, v_registro_id, v_dados_anteriores, v_dados_novos, v_usuario_id, v_usuario_nome, v_registro_codigo, v_empresa_nome, v_descricao);
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION public.cancelar_viagem_completa(p_viagem_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status TEXT; v_entrega RECORD;
BEGIN SELECT status INTO v_status FROM public.viagens WHERE id = p_viagem_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'VIAGEM_NAO_ENCONTRADA'; END IF;
  IF v_status = 'cancelada' THEN RAISE EXCEPTION 'VIAGEM_JA_CANCELADA'; END IF;
  IF v_status = 'finalizada' THEN RAISE EXCEPTION 'VIAGEM_JA_FINALIZADA'; END IF;
  FOR v_entrega IN SELECT e.id, e.carga_id, e.peso_alocado_kg FROM public.viagem_entregas ve JOIN public.entregas e ON e.id = ve.entrega_id WHERE ve.viagem_id = p_viagem_id AND e.status NOT IN ('entregue','cancelada') LOOP
    UPDATE public.entregas SET status = 'cancelada', updated_at = now() WHERE id = v_entrega.id;
    IF v_entrega.peso_alocado_kg > 0 THEN UPDATE public.cargas SET peso_disponivel_kg = COALESCE(peso_disponivel_kg,0) + v_entrega.peso_alocado_kg, updated_at = now() WHERE id = v_entrega.carga_id; END IF;
  END LOOP;
  UPDATE public.viagens SET status = 'cancelada', ended_at = now(), updated_at = now() WHERE id = p_viagem_id;
END; $$;

CREATE OR REPLACE FUNCTION public.expirar_cargas_vencidas() RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_carga RECORD; v_entrega RECORD; v_has_active BOOLEAN;
BEGIN FOR v_carga IN SELECT id FROM public.cargas WHERE expira_em <= now() AND status IN ('publicada','parcialmente_alocada') LOOP
  v_has_active := FALSE;
  FOR v_entrega IN SELECT id, peso_alocado_kg, status FROM public.entregas WHERE carga_id = v_carga.id AND status NOT IN ('entregue','cancelada','problema') LOOP
    IF v_entrega.status IN ('saiu_para_coleta','coletado','em_transito') THEN v_has_active := TRUE;
    ELSE UPDATE public.entregas SET status = 'cancelada', updated_at = now() WHERE id = v_entrega.id;
      IF v_entrega.peso_alocado_kg > 0 THEN UPDATE public.cargas SET peso_disponivel_kg = COALESCE(peso_disponivel_kg,0) + v_entrega.peso_alocado_kg, updated_at = now() WHERE id = v_carga.id; END IF;
    END IF; END LOOP;
  IF v_has_active THEN UPDATE public.cargas SET status = 'parcialmente_finalizada', updated_at = now() WHERE id = v_carga.id;
  ELSE UPDATE public.cargas SET status = 'expirada', updated_at = now() WHERE id = v_carga.id; END IF;
END LOOP; END; $$;

-- D: Tabelas
CREATE TABLE IF NOT EXISTS public.cargos_config (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, nome TEXT NOT NULL, descricao TEXT, escopo TEXT DEFAULT 'torre', protegido BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.cargos_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cargos_config_select" ON public.cargos_config FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.cargo_permissoes (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, cargo_id UUID NOT NULL REFERENCES public.cargos_config(id) ON DELETE CASCADE, chave TEXT NOT NULL, habilitado BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), UNIQUE(cargo_id, chave));
ALTER TABLE public.cargo_permissoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cargo_permissoes_select" ON public.cargo_permissoes FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.empresa_cargos_config (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, empresa_id BIGINT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE, nome TEXT NOT NULL, descricao TEXT, protegido BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), UNIQUE(empresa_id, nome));
ALTER TABLE public.empresa_cargos_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresa_cargos_select" ON public.empresa_cargos_config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "empresa_cargos_manage" ON public.empresa_cargos_config FOR ALL USING (user_belongs_to_empresa(auth.uid(), empresa_id)) WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE TABLE IF NOT EXISTS public.empresa_cargo_permissoes (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, cargo_id UUID NOT NULL REFERENCES public.empresa_cargos_config(id) ON DELETE CASCADE, chave TEXT NOT NULL, habilitado BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), UNIQUE(cargo_id, chave));
ALTER TABLE public.empresa_cargo_permissoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresa_cargo_permissoes_select" ON public.empresa_cargo_permissoes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "empresa_cargo_permissoes_manage" ON public.empresa_cargo_permissoes FOR ALL USING (EXISTS (SELECT 1 FROM public.empresa_cargos_config ec WHERE ec.id = empresa_cargo_permissoes.cargo_id AND user_belongs_to_empresa(auth.uid(), ec.empresa_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.empresa_cargos_config ec WHERE ec.id = empresa_cargo_permissoes.cargo_id AND user_belongs_to_empresa(auth.uid(), ec.empresa_id)));

-- E: Helper functions
CREATE OR REPLACE FUNCTION public.get_cargos_for_scope(p_escopo TEXT) RETURNS TABLE(id UUID, nome TEXT, descricao TEXT, protegido BOOLEAN) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT id, nome, descricao, protegido FROM public.cargos_config WHERE escopo = p_escopo ORDER BY protegido DESC, nome; $$;
CREATE OR REPLACE FUNCTION public.get_empresa_cargos(p_empresa_id BIGINT) RETURNS TABLE(id UUID, nome TEXT, descricao TEXT, protegido BOOLEAN) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT id, nome, descricao, protegido FROM public.empresa_cargos_config WHERE empresa_id = p_empresa_id ORDER BY protegido DESC, nome; $$;

-- F: Audit triggers
DROP TRIGGER IF EXISTS trg_audit_cargo_permissoes ON public.cargo_permissoes;
CREATE TRIGGER trg_audit_cargo_permissoes AFTER INSERT OR UPDATE OR DELETE ON public.cargo_permissoes FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
DROP TRIGGER IF EXISTS trg_audit_empresa_cargos_config ON public.empresa_cargos_config;
CREATE TRIGGER trg_audit_empresa_cargos_config AFTER INSERT OR UPDATE OR DELETE ON public.empresa_cargos_config FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
DROP TRIGGER IF EXISTS trg_audit_empresa_cargo_permissoes ON public.empresa_cargo_permissoes;
CREATE TRIGGER trg_audit_empresa_cargo_permissoes AFTER INSERT OR UPDATE OR DELETE ON public.empresa_cargo_permissoes FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- G: Seeds torre
INSERT INTO public.cargos_config (nome, descricao, escopo, protegido) VALUES ('Super Admin','Acesso total ao sistema','torre',TRUE),('Admin','Gestão operacional e financeira','torre',TRUE),('Suporte','Atendimento a chamados','torre',FALSE),('Financeiro','Gestão financeira','torre',FALSE),('Operações','Monitoramento e gestão','torre',FALSE) ON CONFLICT DO NOTHING;

DO $$ DECLARE v_cid UUID; v_all TEXT[] := ARRAY['dashboard','empresas','usuarios','motoristas','veiculos','carrocerias','cargas','entregas','viagens','monitoramento','financeiro','relatorios','chamados','documentos','pre_cadastros','logs','performance','cargos','storage','ajudantes']; v_k TEXT;
BEGIN
  FOR v_cid IN SELECT id FROM cargos_config WHERE nome IN ('Super Admin','Admin') AND escopo='torre' LOOP FOREACH v_k IN ARRAY v_all LOOP INSERT INTO cargo_permissoes(cargo_id,chave,habilitado) VALUES(v_cid,v_k,TRUE) ON CONFLICT DO NOTHING; END LOOP; END LOOP;
  SELECT id INTO v_cid FROM cargos_config WHERE nome='Suporte' LIMIT 1; IF v_cid IS NOT NULL THEN FOREACH v_k IN ARRAY ARRAY['chamados','empresas','motoristas','entregas','viagens','dashboard'] LOOP INSERT INTO cargo_permissoes(cargo_id,chave,habilitado) VALUES(v_cid,v_k,TRUE) ON CONFLICT DO NOTHING; END LOOP; END IF;
  SELECT id INTO v_cid FROM cargos_config WHERE nome='Financeiro' LIMIT 1; IF v_cid IS NOT NULL THEN FOREACH v_k IN ARRAY ARRAY['financeiro','relatorios','empresas','dashboard'] LOOP INSERT INTO cargo_permissoes(cargo_id,chave,habilitado) VALUES(v_cid,v_k,TRUE) ON CONFLICT DO NOTHING; END LOOP; END IF;
  SELECT id INTO v_cid FROM cargos_config WHERE nome='Operações' LIMIT 1; IF v_cid IS NOT NULL THEN FOREACH v_k IN ARRAY ARRAY['dashboard','monitoramento','entregas','viagens','cargas','motoristas','veiculos'] LOOP INSERT INTO cargo_permissoes(cargo_id,chave,habilitado) VALUES(v_cid,v_k,TRUE) ON CONFLICT DO NOTHING; END LOOP; END IF;
END; $$;

-- H: Backfill empresas
DO $$ DECLARE v_emp RECORD; v_cid UUID;
  v_emb TEXT[] := ARRAY['dashboard','cargas','historico_cargas','financeiro','relatorios','mensagens','notificacoes','dados_empresa','filiais','usuarios','contatos','integracoes','configuracoes','cargos','assistente'];
  v_trn TEXT[] := ARRAY['dashboard','ofertas','operacao','historico_entregas','motoristas','frota_veiculos','frota_carrocerias','frota_vinculos','financeiro','relatorios','mensagens','notificacoes','dados_empresa','filiais','usuarios','conta_bancaria','fiscal','integracoes','configuracoes','cargos','assistente'];
  v_ch TEXT[]; v_k TEXT;
BEGIN FOR v_emp IN SELECT id, tipo::text as t FROM empresas LOOP
  INSERT INTO empresa_cargos_config(empresa_id,nome,descricao,protegido) VALUES(v_emp.id,'Administrador','Acesso total à gestão da empresa',TRUE) ON CONFLICT(empresa_id,nome) DO NOTHING RETURNING id INTO v_cid;
  IF v_cid IS NULL THEN SELECT id INTO v_cid FROM empresa_cargos_config WHERE empresa_id=v_emp.id AND nome='Administrador'; END IF;
  IF v_emp.t='EMBARCADOR' THEN v_ch:=v_emb; ELSE v_ch:=v_trn; END IF;
  FOREACH v_k IN ARRAY v_ch LOOP INSERT INTO empresa_cargo_permissoes(cargo_id,chave,habilitado) VALUES(v_cid,v_k,TRUE) ON CONFLICT DO NOTHING; END LOOP;
END LOOP; END; $$;

-- I: Rename ADMIN → Administrador (o rename do enum é idempotente, e não precisa de UPDATE pois o rename já afeta os registros existentes)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'usuario_cargo' AND e.enumlabel = 'ADMIN') THEN
    ALTER TYPE public.usuario_cargo RENAME VALUE 'ADMIN' TO 'Administrador';
  END IF;
END; $$;

-- J: Trigger crédito
CREATE OR REPLACE FUNCTION public.fn_ajustar_credito_financeiro() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_eid INTEGER;
BEGIN v_eid := COALESCE(NEW.empresa_embarcadora_id, OLD.empresa_embarcadora_id); IF v_eid IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' AND NEW.status='pendente' THEN UPDATE empresa_config_financeira SET credito_utilizado=credito_utilizado+COALESCE(NEW.valor_frete,0),updated_at=now() WHERE empresa_id=v_eid;
  ELSIF TG_OP='UPDATE' AND OLD.status='pendente' AND NEW.status='pago' THEN UPDATE empresa_config_financeira SET credito_utilizado=GREATEST(0,credito_utilizado-COALESCE(NEW.valor_frete,0)),updated_at=now() WHERE empresa_id=v_eid; END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_credito_financeiro ON public.financeiro_entregas;
CREATE TRIGGER trg_credito_financeiro AFTER INSERT OR UPDATE ON public.financeiro_entregas FOR EACH ROW EXECUTE FUNCTION fn_ajustar_credito_financeiro();

-- K: Normalização
CREATE OR REPLACE FUNCTION public.fn_normalizar_status_entrega() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN IF NEW.status IS NOT NULL THEN NEW.status := LOWER(NEW.status::TEXT)::status_entrega; END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_normalizar_status_entrega ON public.entregas;
CREATE TRIGGER trg_normalizar_status_entrega BEFORE INSERT OR UPDATE OF status ON public.entregas FOR EACH ROW EXECUTE FUNCTION fn_normalizar_status_entrega();

-- L: Notificação
CREATE OR REPLACE FUNCTION public.fn_notificar_mudanca_status_entrega() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_eid BIGINT; v_u RECORD; v_t TEXT; v_m TEXT; v_c TEXT;
BEGIN IF OLD.status IS DISTINCT FROM NEW.status THEN
  SELECT c.empresa_id, e.codigo INTO v_eid, v_c FROM entregas e JOIN cargas c ON c.id=e.carga_id WHERE e.id=NEW.id;
  v_t:='Entrega '||COALESCE(v_c,NEW.id::TEXT)||' atualizada'; v_m:='Status alterado para: '||NEW.status::TEXT;
  FOR v_u IN SELECT u.auth_user_id FROM usuarios u JOIN usuarios_filiais uf ON uf.usuario_id=u.id JOIN filiais f ON f.id=uf.filial_id WHERE f.empresa_id=v_eid AND u.auth_user_id IS NOT NULL LOOP
    INSERT INTO notificacoes(user_id,titulo,mensagem,tipo,referencia_id,referencia_tipo) VALUES(v_u.auth_user_id,v_t,v_m,'entrega',NEW.id,'entregas');
  END LOOP; END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notificar_status_entrega ON public.entregas;
CREATE TRIGGER trg_notificar_status_entrega AFTER UPDATE OF status ON public.entregas FOR EACH ROW EXECUTE FUNCTION fn_notificar_mudanca_status_entrega();
