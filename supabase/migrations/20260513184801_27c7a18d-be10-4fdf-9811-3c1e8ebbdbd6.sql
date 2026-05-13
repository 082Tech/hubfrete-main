
-- =========================================================
-- 1. Drop sensitive credential columns
-- =========================================================
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS senha;
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS jwt;
ALTER TABLE public.motoristas DROP COLUMN IF EXISTS senha;
ALTER TABLE public.motoristas DROP COLUMN IF EXISTS jwt;

-- =========================================================
-- Helper: motorista belongs to user (driver themselves)
-- =========================================================
CREATE OR REPLACE FUNCTION public.user_owns_motorista(_user_id uuid, _motorista_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM motoristas WHERE id = _motorista_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_viagem(_user_id uuid, _viagem_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM viagens v
    LEFT JOIN motoristas m ON m.id = v.motorista_id
    WHERE v.id = _viagem_id AND (
      public.is_admin(_user_id)
      OR m.user_id = _user_id
      OR public.user_belongs_to_empresa(_user_id, m.empresa_id)
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_carga(_user_id uuid, _carga_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM cargas c
    WHERE c.id = _carga_id AND (
      public.is_admin(_user_id)
      OR public.user_belongs_to_empresa(_user_id, c.empresa_id)
    )
  )
$$;

-- =========================================================
-- 2. viagens: scope INSERT/UPDATE
-- =========================================================
DROP POLICY IF EXISTS "Sistema pode inserir viagens" ON public.viagens;
DROP POLICY IF EXISTS "Sistema pode atualizar viagens" ON public.viagens;

CREATE POLICY "viagens_insert_scoped" ON public.viagens FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.user_owns_motorista(auth.uid(), motorista_id)
  OR EXISTS (SELECT 1 FROM motoristas m WHERE m.id = motorista_id AND public.user_belongs_to_empresa(auth.uid(), m.empresa_id))
);

CREATE POLICY "viagens_update_scoped" ON public.viagens FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.user_owns_motorista(auth.uid(), motorista_id)
  OR EXISTS (SELECT 1 FROM motoristas m WHERE m.id = motorista_id AND public.user_belongs_to_empresa(auth.uid(), m.empresa_id))
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.user_owns_motorista(auth.uid(), motorista_id)
  OR EXISTS (SELECT 1 FROM motoristas m WHERE m.id = motorista_id AND public.user_belongs_to_empresa(auth.uid(), m.empresa_id))
);

-- =========================================================
-- 3. carga_eventos: require auth + company scope
-- =========================================================
DROP POLICY IF EXISTS "carga_eventos_select" ON public.carga_eventos;
DROP POLICY IF EXISTS "carga_eventos_insert" ON public.carga_eventos;
DROP POLICY IF EXISTS "carga_eventos_update" ON public.carga_eventos;
DROP POLICY IF EXISTS "carga_eventos_delete" ON public.carga_eventos;

CREATE POLICY "carga_eventos_select_scoped" ON public.carga_eventos FOR SELECT TO authenticated
USING (public.user_can_access_carga(auth.uid(), carga_id));
CREATE POLICY "carga_eventos_insert_scoped" ON public.carga_eventos FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_carga(auth.uid(), carga_id));
CREATE POLICY "carga_eventos_update_admin" ON public.carga_eventos FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));
CREATE POLICY "carga_eventos_delete_admin" ON public.carga_eventos FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- =========================================================
-- 4. ctes
-- =========================================================
DROP POLICY IF EXISTS "Auth users can read ctes" ON public.ctes;
DROP POLICY IF EXISTS "Auth users can insert ctes" ON public.ctes;
DROP POLICY IF EXISTS "Auth users can update ctes" ON public.ctes;
DROP POLICY IF EXISTS "Auth users can delete ctes" ON public.ctes;

CREATE POLICY "ctes_select_scoped" ON public.ctes FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.user_belongs_to_empresa(auth.uid(), empresa_id)
  OR (entrega_id IS NOT NULL AND public.user_can_access_entrega(auth.uid(), entrega_id))
);
CREATE POLICY "ctes_insert_scoped" ON public.ctes FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.user_belongs_to_empresa(auth.uid(), empresa_id)
  OR (entrega_id IS NOT NULL AND public.user_can_access_entrega(auth.uid(), entrega_id))
);
CREATE POLICY "ctes_update_scoped" ON public.ctes FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.user_belongs_to_empresa(auth.uid(), empresa_id)
);
CREATE POLICY "ctes_delete_admin" ON public.ctes FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- =========================================================
-- 5. nfes
-- =========================================================
DROP POLICY IF EXISTS "Auth users can read nfes" ON public.nfes;
DROP POLICY IF EXISTS "Auth users can insert nfes" ON public.nfes;
DROP POLICY IF EXISTS "Auth users can update nfes" ON public.nfes;
DROP POLICY IF EXISTS "Auth users can delete nfes" ON public.nfes;

CREATE POLICY "nfes_select_scoped" ON public.nfes FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (entrega_id IS NOT NULL AND public.user_can_access_entrega(auth.uid(), entrega_id))
);
CREATE POLICY "nfes_insert_scoped" ON public.nfes FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR (entrega_id IS NOT NULL AND public.user_can_access_entrega(auth.uid(), entrega_id))
);
CREATE POLICY "nfes_update_scoped" ON public.nfes FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (entrega_id IS NOT NULL AND public.user_can_access_entrega(auth.uid(), entrega_id))
);
CREATE POLICY "nfes_delete_admin" ON public.nfes FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- =========================================================
-- 6. manifestos
-- =========================================================
DROP POLICY IF EXISTS "Auth users can read manifestos" ON public.manifestos;
DROP POLICY IF EXISTS "Auth users can insert manifestos" ON public.manifestos;
DROP POLICY IF EXISTS "Auth users can update manifestos" ON public.manifestos;

CREATE POLICY "manifestos_select_scoped" ON public.manifestos FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "manifestos_insert_scoped" ON public.manifestos FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "manifestos_update_scoped" ON public.manifestos FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.user_belongs_to_empresa(auth.uid(), empresa_id));

-- =========================================================
-- 7. manifesto_ctes (link table)
-- =========================================================
DROP POLICY IF EXISTS "Auth users can read manifesto_ctes" ON public.manifesto_ctes;
DROP POLICY IF EXISTS "Auth users can insert manifesto_ctes" ON public.manifesto_ctes;

CREATE POLICY "manifesto_ctes_select_scoped" ON public.manifesto_ctes FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM manifestos m WHERE m.id = manifesto_id AND public.user_belongs_to_empresa(auth.uid(), m.empresa_id))
);
CREATE POLICY "manifesto_ctes_insert_scoped" ON public.manifesto_ctes FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM manifestos m WHERE m.id = manifesto_id AND public.user_belongs_to_empresa(auth.uid(), m.empresa_id))
);

-- =========================================================
-- 8. desvio_auditoria
-- =========================================================
DROP POLICY IF EXISTS "desvio_auditoria_select" ON public.desvio_auditoria;
DROP POLICY IF EXISTS "desvio_auditoria_insert" ON public.desvio_auditoria;

CREATE POLICY "desvio_auditoria_select_scoped" ON public.desvio_auditoria FOR SELECT TO authenticated
USING (public.user_can_access_viagem(auth.uid(), viagem_id));
CREATE POLICY "desvio_auditoria_insert_scoped" ON public.desvio_auditoria FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_viagem(auth.uid(), viagem_id));

-- =========================================================
-- 9. empresas
-- =========================================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.empresas;

CREATE POLICY "empresas_select_scoped" ON public.empresas FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.user_belongs_to_empresa(auth.uid(), id));
CREATE POLICY "empresas_insert_admin" ON public.empresas FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "empresas_update_scoped" ON public.empresas FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.user_is_admin_of_empresa(auth.uid(), id))
WITH CHECK (public.is_admin(auth.uid()) OR public.user_is_admin_of_empresa(auth.uid(), id));
CREATE POLICY "empresas_delete_admin" ON public.empresas FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- =========================================================
-- 10. filiais
-- =========================================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.filiais;

CREATE POLICY "filiais_select_scoped" ON public.filiais FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "filiais_insert_scoped" ON public.filiais FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.user_is_admin_of_empresa(auth.uid(), empresa_id));
CREATE POLICY "filiais_update_scoped" ON public.filiais FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.user_is_admin_of_empresa(auth.uid(), empresa_id))
WITH CHECK (public.is_admin(auth.uid()) OR public.user_is_admin_of_empresa(auth.uid(), empresa_id));
CREATE POLICY "filiais_delete_admin" ON public.filiais FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) OR public.user_is_admin_of_empresa(auth.uid(), empresa_id));

-- =========================================================
-- 11. enderecos_carga
-- =========================================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.enderecos_carga;

CREATE POLICY "enderecos_carga_select_scoped" ON public.enderecos_carga FOR SELECT TO authenticated
USING (public.user_can_access_carga(auth.uid(), carga_id));
CREATE POLICY "enderecos_carga_insert_scoped" ON public.enderecos_carga FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_carga(auth.uid(), carga_id));
CREATE POLICY "enderecos_carga_update_scoped" ON public.enderecos_carga FOR UPDATE TO authenticated
USING (public.user_can_access_carga(auth.uid(), carga_id))
WITH CHECK (public.user_can_access_carga(auth.uid(), carga_id));
CREATE POLICY "enderecos_carga_delete_scoped" ON public.enderecos_carga FOR DELETE TO authenticated
USING (public.user_can_access_carga(auth.uid(), carga_id));

-- =========================================================
-- 12. entregas
-- =========================================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.entregas;

CREATE POLICY "entregas_select_scoped" ON public.entregas FOR SELECT TO authenticated
USING (public.user_can_access_entrega(auth.uid(), id));
CREATE POLICY "entregas_insert_scoped" ON public.entregas FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.user_can_access_carga(auth.uid(), carga_id)
  OR (motorista_id IS NOT NULL AND public.user_can_access_motorista(auth.uid(), motorista_id))
);
CREATE POLICY "entregas_update_scoped" ON public.entregas FOR UPDATE TO authenticated
USING (public.user_can_access_entrega(auth.uid(), id))
WITH CHECK (public.user_can_access_entrega(auth.uid(), id));
CREATE POLICY "entregas_delete_admin" ON public.entregas FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- =========================================================
-- 13. veiculos
-- =========================================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.veiculos;

CREATE POLICY "veiculos_select_scoped" ON public.veiculos FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (motorista_padrao_id IS NOT NULL AND public.user_can_access_motorista(auth.uid(), motorista_padrao_id))
  OR created_by = auth.uid()
);
CREATE POLICY "veiculos_insert_scoped" ON public.veiculos FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR (motorista_padrao_id IS NOT NULL AND public.user_can_access_motorista(auth.uid(), motorista_padrao_id))
);
CREATE POLICY "veiculos_update_scoped" ON public.veiculos FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (motorista_padrao_id IS NOT NULL AND public.user_can_access_motorista(auth.uid(), motorista_padrao_id))
  OR created_by = auth.uid()
);
CREATE POLICY "veiculos_delete_admin" ON public.veiculos FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- =========================================================
-- 14. veiculo_custo_config
-- =========================================================
DROP POLICY IF EXISTS "veiculo_custo_access" ON public.veiculo_custo_config;

CREATE POLICY "veiculo_custo_select_scoped" ON public.veiculo_custo_config FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM veiculos v WHERE v.id = veiculo_id AND (
    v.created_by = auth.uid()
    OR (v.motorista_padrao_id IS NOT NULL AND public.user_can_access_motorista(auth.uid(), v.motorista_padrao_id))
  ))
);
CREATE POLICY "veiculo_custo_modify_scoped" ON public.veiculo_custo_config FOR ALL TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM veiculos v WHERE v.id = veiculo_id AND (
    v.created_by = auth.uid()
    OR (v.motorista_padrao_id IS NOT NULL AND public.user_can_access_motorista(auth.uid(), v.motorista_padrao_id))
  ))
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM veiculos v WHERE v.id = veiculo_id AND (
    v.created_by = auth.uid()
    OR (v.motorista_padrao_id IS NOT NULL AND public.user_can_access_motorista(auth.uid(), v.motorista_padrao_id))
  ))
);

-- =========================================================
-- 15. locations
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can read localizações" ON public.locations;

CREATE POLICY "locations_select_scoped" ON public.locations FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (motorista_id IS NOT NULL AND public.user_can_access_motorista(auth.uid(), motorista_id))
);

-- =========================================================
-- 16. carga_precos_eixo
-- =========================================================
DROP POLICY IF EXISTS "carga_precos_eixo_all_authenticated" ON public.carga_precos_eixo;

CREATE POLICY "carga_precos_eixo_select_scoped" ON public.carga_precos_eixo FOR SELECT TO authenticated
USING (public.user_can_access_carga(auth.uid(), carga_id));
CREATE POLICY "carga_precos_eixo_modify_scoped" ON public.carga_precos_eixo FOR ALL TO authenticated
USING (public.user_can_access_carga(auth.uid(), carga_id))
WITH CHECK (public.user_can_access_carga(auth.uid(), carga_id));

-- =========================================================
-- 17. tracking_historico (restrict insert)
-- =========================================================
DROP POLICY IF EXISTS "Edge Function insere tracking" ON public.tracking_historico;

CREATE POLICY "tracking_historico_insert_scoped" ON public.tracking_historico FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_viagem(auth.uid(), viagem_id));

-- =========================================================
-- 18. financeiro_entregas: motorista can view own
-- =========================================================
CREATE POLICY "financeiro_entregas_motorista_select" ON public.financeiro_entregas FOR SELECT TO authenticated
USING (motorista_id IS NOT NULL AND public.user_owns_motorista(auth.uid(), motorista_id));

-- =========================================================
-- 19. pre_cadastros: tighten anonymous insert
-- =========================================================
DROP POLICY IF EXISTS "Allow anonymous insert pre_cadastros" ON public.pre_cadastros;
DROP POLICY IF EXISTS "Anyone can submit pre-registration" ON public.pre_cadastros;

CREATE POLICY "pre_cadastros_insert_public" ON public.pre_cadastros FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pendente'
  AND analisado_por IS NULL
  AND analisado_em IS NULL
  AND motivo_rejeicao IS NULL
  AND length(coalesce(razao_social, nome_fantasia, nome_empresa, '')) > 0
);

-- =========================================================
-- 20. STORAGE: documentos + comprovantes-financeiro
-- =========================================================
-- Drop existing broad policies on these buckets (best effort by name guesses)
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (qual LIKE '%comprovantes-financeiro%' OR with_check LIKE '%comprovantes-financeiro%'
           OR qual LIKE '%''documentos''%' OR with_check LIKE '%''documentos''%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "documentos_select_owner_or_admin" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documentos' AND (owner = auth.uid() OR public.is_admin(auth.uid())));
CREATE POLICY "documentos_insert_owner" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos' AND owner = auth.uid());
CREATE POLICY "documentos_update_owner_or_admin" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documentos' AND (owner = auth.uid() OR public.is_admin(auth.uid())));
CREATE POLICY "documentos_delete_owner_or_admin" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documentos' AND (owner = auth.uid() OR public.is_admin(auth.uid())));

CREATE POLICY "comprovantes_financeiro_select_owner_or_admin" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'comprovantes-financeiro' AND (owner = auth.uid() OR public.is_admin(auth.uid())));
CREATE POLICY "comprovantes_financeiro_insert_owner" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'comprovantes-financeiro' AND owner = auth.uid());
CREATE POLICY "comprovantes_financeiro_update_owner_or_admin" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'comprovantes-financeiro' AND (owner = auth.uid() OR public.is_admin(auth.uid())));
CREATE POLICY "comprovantes_financeiro_delete_owner_or_admin" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'comprovantes-financeiro' AND (owner = auth.uid() OR public.is_admin(auth.uid())));
