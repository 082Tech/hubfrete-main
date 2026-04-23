DO $$
DECLARE
  v_emp_id BIGINT;
  v_fil_id BIGINT;
  v_usr_id INTEGER;
  v_auth_id UUID := '5783f2e6-e664-4f53-8efb-eb546c3589f2';
BEGIN
  INSERT INTO public.empresas (tipo, classe, nome, razao_social, nome_fantasia, cnpj_matriz, email, status)
  VALUES ('EMBARCADOR'::tipo_empresa, 'INDÚSTRIA'::classe_empresa, 'Quartzolit',
          'Saint-Gobain do Brasil Produtos Industriais e para Construção Ltda',
          'Quartzolit', '61.064.838/0001-67', 'nayara@gmail.com', 'ativa')
  RETURNING id INTO v_emp_id;

  INSERT INTO public.filiais (empresa_id, nome, cnpj, is_matriz, ativa, cidade, estado)
  VALUES (v_emp_id, 'Matriz', '61.064.838/0001-67', true, true, 'São Paulo', 'SP')
  RETURNING id INTO v_fil_id;

  INSERT INTO public.usuarios (auth_user_id, email, nome, cargo, motorista_autonomo)
  VALUES (v_auth_id, 'nayara@gmail.com', 'Nayara', 'Administrador'::usuario_cargo, false)
  RETURNING id INTO v_usr_id;

  INSERT INTO public.usuarios_filiais (usuario_id, filial_id, cargo_na_filial)
  VALUES (v_usr_id, v_fil_id, 'Administrador'::usuario_cargo);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_auth_id, 'embarcador'::app_role)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Empresa Quartzolit criada: id=%, filial=%, usuario=%', v_emp_id, v_fil_id, v_usr_id;
END $$;