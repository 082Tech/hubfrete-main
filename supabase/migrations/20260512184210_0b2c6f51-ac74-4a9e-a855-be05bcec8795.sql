
-- Helpers
CREATE OR REPLACE FUNCTION public.user_can_access_motorista(_user_id uuid, _motorista_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM motoristas m
    WHERE m.id = _motorista_id
      AND (
        m.user_id = _user_id
        OR public.user_belongs_to_empresa(_user_id, m.empresa_id)
        OR public.is_admin(_user_id)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_entrega(_user_id uuid, _entrega_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM entregas e
    LEFT JOIN cargas c ON c.id = e.carga_id
    LEFT JOIN motoristas m ON m.id = e.motorista_id
    WHERE e.id = _entrega_id
      AND (
        public.is_admin(_user_id)
        OR (m.user_id = _user_id)
        OR public.user_belongs_to_empresa(_user_id, m.empresa_id)
        OR public.user_belongs_to_empresa(_user_id, c.empresa_id)
      )
  )
$$;

-- Helper: check if auth user is "Administrador" of an empresa
CREATE OR REPLACE FUNCTION public.user_is_admin_of_empresa(_user_id uuid, _empresa_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    JOIN public.usuarios_filiais uf ON uf.usuario_id = u.id
    JOIN public.filiais f ON f.id = uf.filial_id
    WHERE u.auth_user_id = _user_id
      AND f.empresa_id = _empresa_id
      AND u.cargo = 'Administrador'::usuario_cargo
  )
$$;

-- auditoria_logs
DROP POLICY IF EXISTS auditoria_logs_select ON public.auditoria_logs;
CREATE POLICY auditoria_logs_admin_select ON public.auditoria_logs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- documentos_validacao
DROP POLICY IF EXISTS documentos_select ON public.documentos_validacao;
DROP POLICY IF EXISTS documentos_all ON public.documentos_validacao;
CREATE POLICY documentos_validacao_select ON public.documentos_validacao
  FOR SELECT TO authenticated USING (public.user_can_access_motorista(auth.uid(), motorista_id));
CREATE POLICY documentos_validacao_modify ON public.documentos_validacao
  FOR ALL TO authenticated
  USING (public.user_can_access_motorista(auth.uid(), motorista_id))
  WITH CHECK (public.user_can_access_motorista(auth.uid(), motorista_id));

-- motorista_kpis
DROP POLICY IF EXISTS motorista_kpis_select ON public.motorista_kpis;
DROP POLICY IF EXISTS motorista_kpis_all ON public.motorista_kpis;
CREATE POLICY motorista_kpis_select ON public.motorista_kpis
  FOR SELECT TO authenticated USING (public.user_can_access_motorista(auth.uid(), motorista_id));
CREATE POLICY motorista_kpis_modify ON public.motorista_kpis
  FOR ALL TO authenticated
  USING (public.user_can_access_motorista(auth.uid(), motorista_id))
  WITH CHECK (public.user_can_access_motorista(auth.uid(), motorista_id));

-- empresas: drop anon read
DROP POLICY IF EXISTS "Public can read company public fields" ON public.empresas;

-- ajudantes
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.ajudantes;
CREATE POLICY ajudantes_select ON public.ajudantes
  FOR SELECT TO authenticated USING (public.user_can_access_motorista(auth.uid(), motorista_id));
CREATE POLICY ajudantes_modify ON public.ajudantes
  FOR ALL TO authenticated
  USING (public.user_can_access_motorista(auth.uid(), motorista_id))
  WITH CHECK (public.user_can_access_motorista(auth.uid(), motorista_id));

-- motorista_referencias
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.motorista_referencias;
CREATE POLICY motorista_referencias_select ON public.motorista_referencias
  FOR SELECT TO authenticated USING (public.user_can_access_motorista(auth.uid(), motorista_id));
CREATE POLICY motorista_referencias_modify ON public.motorista_referencias
  FOR ALL TO authenticated
  USING (public.user_can_access_motorista(auth.uid(), motorista_id))
  WITH CHECK (public.user_can_access_motorista(auth.uid(), motorista_id));

-- usuarios_filiais
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.usuarios_filiais;
CREATE POLICY usuarios_filiais_select ON public.usuarios_filiais
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.filiais f
      WHERE f.id = usuarios_filiais.filial_id
        AND public.user_belongs_to_empresa(auth.uid(), f.empresa_id)
    )
  );
CREATE POLICY usuarios_filiais_modify ON public.usuarios_filiais
  FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.filiais f
      WHERE f.id = usuarios_filiais.filial_id
        AND public.user_is_admin_of_empresa(auth.uid(), f.empresa_id)
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.filiais f
      WHERE f.id = usuarios_filiais.filial_id
        AND public.user_is_admin_of_empresa(auth.uid(), f.empresa_id)
    )
  );

-- motoristas
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.motoristas;
CREATE POLICY motoristas_select ON public.motoristas
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.user_belongs_to_empresa(auth.uid(), empresa_id)
    OR public.is_admin(auth.uid())
  );
CREATE POLICY motoristas_modify ON public.motoristas
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.user_belongs_to_empresa(auth.uid(), empresa_id)
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.user_belongs_to_empresa(auth.uid(), empresa_id)
    OR public.is_admin(auth.uid())
  );

-- usuarios
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.usuarios;
CREATE POLICY usuarios_select ON public.usuarios
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.usuarios_filiais uf_self
      JOIN public.filiais f_self ON f_self.id = uf_self.filial_id
      JOIN public.usuarios u_self ON u_self.id = uf_self.usuario_id
      JOIN public.filiais f_other ON f_other.empresa_id = f_self.empresa_id
      JOIN public.usuarios_filiais uf_other ON uf_other.filial_id = f_other.id
      WHERE u_self.auth_user_id = auth.uid()
        AND uf_other.usuario_id = usuarios.id
    )
  );
CREATE POLICY usuarios_update_self ON public.usuarios
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (auth_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY usuarios_insert_self ON public.usuarios
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY usuarios_delete_admin ON public.usuarios
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- v2f
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.v2f;
CREATE POLICY v2f_self_select ON public.v2f
  FOR SELECT TO authenticated USING (email = auth.email());
CREATE POLICY v2f_self_modify ON public.v2f
  FOR ALL TO authenticated
  USING (email = auth.email()) WITH CHECK (email = auth.email());

-- certificados_digitais
DROP POLICY IF EXISTS "Apenas ADMINs da empresa podem ver e atualizar o certificado" ON public.certificados_digitais;
CREATE POLICY certificados_digitais_admin_empresa ON public.certificados_digitais
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.user_is_admin_of_empresa(auth.uid(), empresa_id))
  WITH CHECK (public.is_admin(auth.uid()) OR public.user_is_admin_of_empresa(auth.uid(), empresa_id));

-- gnres
DROP POLICY IF EXISTS "Empresas podem ver e gerenciar suas próprias GNREs" ON public.gnres;
CREATE POLICY gnres_empresa_access ON public.gnres
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.user_belongs_to_empresa(auth.uid(), empresa_id))
  WITH CHECK (public.is_admin(auth.uid()) OR public.user_belongs_to_empresa(auth.uid(), empresa_id));

-- carrocerias
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.carrocerias;
CREATE POLICY carrocerias_empresa_access ON public.carrocerias
  FOR ALL TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id) OR public.is_admin(auth.uid()));

-- cargas
DROP POLICY IF EXISTS "Authenticated users can view cargas" ON public.cargas;
DROP POLICY IF EXISTS "Authenticated users can insert cargas" ON public.cargas;
DROP POLICY IF EXISTS "Authenticated users can update cargas" ON public.cargas;
DROP POLICY IF EXISTS "Authenticated users can delete cargas" ON public.cargas;
CREATE POLICY cargas_select ON public.cargas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY cargas_insert ON public.cargas
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id) OR public.is_admin(auth.uid()));
CREATE POLICY cargas_update ON public.cargas
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id) OR public.is_admin(auth.uid()));
CREATE POLICY cargas_delete ON public.cargas
  FOR DELETE TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id) OR public.is_admin(auth.uid()));

-- viagem_entregas
DROP POLICY IF EXISTS "Sistema pode gerenciar vínculos" ON public.viagem_entregas;
CREATE POLICY viagem_entregas_modify ON public.viagem_entregas
  FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.viagens v
      LEFT JOIN public.motoristas m ON m.id = v.motorista_id
      WHERE v.id = viagem_entregas.viagem_id
        AND (m.user_id = auth.uid() OR public.user_belongs_to_empresa(auth.uid(), m.empresa_id))
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.viagens v
      LEFT JOIN public.motoristas m ON m.id = v.motorista_id
      WHERE v.id = viagem_entregas.viagem_id
        AND (m.user_id = auth.uid() OR public.user_belongs_to_empresa(auth.uid(), m.empresa_id))
    )
  );

-- entrega_eventos
DROP POLICY IF EXISTS entrega_eventos_select ON public.entrega_eventos;
DROP POLICY IF EXISTS entrega_eventos_insert ON public.entrega_eventos;
DROP POLICY IF EXISTS entrega_eventos_update ON public.entrega_eventos;
DROP POLICY IF EXISTS entrega_eventos_delete ON public.entrega_eventos;
CREATE POLICY entrega_eventos_select ON public.entrega_eventos
  FOR SELECT TO authenticated USING (public.user_can_access_entrega(auth.uid(), entrega_id));
CREATE POLICY entrega_eventos_modify ON public.entrega_eventos
  FOR ALL TO authenticated
  USING (public.user_can_access_entrega(auth.uid(), entrega_id))
  WITH CHECK (public.user_can_access_entrega(auth.uid(), entrega_id));

-- geofences
DROP POLICY IF EXISTS geofences_select ON public.geofences;
DROP POLICY IF EXISTS geofences_all ON public.geofences;
CREATE POLICY geofences_select ON public.geofences
  FOR SELECT TO authenticated USING (public.user_can_access_entrega(auth.uid(), entrega_id));
CREATE POLICY geofences_modify ON public.geofences
  FOR ALL TO authenticated
  USING (public.user_can_access_entrega(auth.uid(), entrega_id))
  WITH CHECK (public.user_can_access_entrega(auth.uid(), entrega_id));

-- provas_entrega
DROP POLICY IF EXISTS provas_entrega_select ON public.provas_entrega;
DROP POLICY IF EXISTS provas_entrega_all ON public.provas_entrega;
CREATE POLICY provas_entrega_select ON public.provas_entrega
  FOR SELECT TO authenticated USING (public.user_can_access_entrega(auth.uid(), entrega_id));
CREATE POLICY provas_entrega_modify ON public.provas_entrega
  FOR ALL TO authenticated
  USING (public.user_can_access_entrega(auth.uid(), entrega_id))
  WITH CHECK (public.user_can_access_entrega(auth.uid(), entrega_id));

-- veiculo_custo_config
DROP POLICY IF EXISTS veiculo_custo_select ON public.veiculo_custo_config;
DROP POLICY IF EXISTS veiculo_custo_all ON public.veiculo_custo_config;
CREATE POLICY veiculo_custo_access ON public.veiculo_custo_config
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
