
-- 1. Rename enum value (auto-updates all rows using it)
ALTER TYPE public.usuario_cargo RENAME VALUE 'ADMIN' TO 'Administrador';

-- 2. Update empresa_cargos_config default cargo name
UPDATE public.empresa_cargos_config SET nome = 'Administrador' WHERE nome = 'ADMIN';

-- 3. Update the trigger function to use 'Administrador'
CREATE OR REPLACE FUNCTION public.fn_create_default_empresa_cargo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_cargo_id uuid;
  empresa_tipo text;
  v_permissoes text[];
BEGIN
  INSERT INTO empresa_cargos_config (empresa_id, nome, descricao, editavel)
  VALUES (NEW.id, 'Administrador', 'Administrador da empresa com acesso total', false)
  RETURNING id INTO new_cargo_id;

  SELECT tipo INTO empresa_tipo FROM empresas WHERE id = NEW.id;

  IF empresa_tipo = 'EMBARCADOR' THEN
    v_permissoes := ARRAY[
      'cargas.visualizar','cargas.criar','cargas.editar',
      'entregas.visualizar','entregas.finalizar',
      'mensagens.visualizar','mensagens.enviar',
      'financeiro.visualizar','financeiro.exportar',
      'relatorios.visualizar','relatorios.exportar',
      'filiais.visualizar','filiais.editar',
      'usuarios.visualizar','usuarios.gerenciar','usuarios.convidar',
      'configuracoes.visualizar','configuracoes.editar'
    ];
  ELSE
    v_permissoes := ARRAY[
      'cargas.visualizar','cargas.criar','cargas.editar',
      'entregas.visualizar','entregas.finalizar',
      'frota.visualizar','frota.editar',
      'motoristas.visualizar','motoristas.editar',
      'mensagens.visualizar','mensagens.enviar',
      'financeiro.visualizar','financeiro.exportar',
      'relatorios.visualizar','relatorios.exportar',
      'filiais.visualizar','filiais.editar',
      'usuarios.visualizar','usuarios.gerenciar','usuarios.convidar',
      'configuracoes.visualizar','configuracoes.editar'
    ];
  END IF;

  INSERT INTO empresa_cargo_permissoes (empresa_cargo_id, permissao, permitido)
  SELECT new_cargo_id, p, true
  FROM unnest(v_permissoes) AS p;

  RETURN NEW;
END;
$function$;
