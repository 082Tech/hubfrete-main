
-- Backfill permissions for existing empresa cargos that have 0 permissions
-- Embarcador permissions
INSERT INTO public.empresa_cargo_permissoes (empresa_cargo_id, permissao, permitido)
SELECT ecc.id, p.permissao, false
FROM empresa_cargos_config ecc
JOIN empresas e ON e.id = ecc.empresa_id
CROSS JOIN (VALUES
  ('cargas.visualizar'), ('cargas.criar'), ('cargas.editar'),
  ('entregas.visualizar'), ('entregas.finalizar'),
  ('mensagens.visualizar'), ('mensagens.enviar'),
  ('financeiro.visualizar'), ('financeiro.exportar'),
  ('relatorios.visualizar'), ('relatorios.exportar'),
  ('filiais.visualizar'), ('filiais.editar'),
  ('usuarios.visualizar'), ('usuarios.gerenciar'), ('usuarios.convidar'),
  ('configuracoes.visualizar'), ('configuracoes.editar')
) AS p(permissao)
WHERE e.tipo = 'EMBARCADOR'
AND NOT EXISTS (
  SELECT 1 FROM empresa_cargo_permissoes ecp WHERE ecp.empresa_cargo_id = ecc.id
);

-- Transportadora permissions
INSERT INTO public.empresa_cargo_permissoes (empresa_cargo_id, permissao, permitido)
SELECT ecc.id, p.permissao, false
FROM empresa_cargos_config ecc
JOIN empresas e ON e.id = ecc.empresa_id
CROSS JOIN (VALUES
  ('cargas.visualizar'), ('cargas.criar'), ('cargas.editar'),
  ('entregas.visualizar'), ('entregas.finalizar'),
  ('frota.visualizar'), ('frota.editar'),
  ('motoristas.visualizar'), ('motoristas.editar'),
  ('mensagens.visualizar'), ('mensagens.enviar'),
  ('financeiro.visualizar'), ('financeiro.exportar'),
  ('relatorios.visualizar'), ('relatorios.exportar'),
  ('filiais.visualizar'), ('filiais.editar'),
  ('usuarios.visualizar'), ('usuarios.gerenciar'), ('usuarios.convidar'),
  ('configuracoes.visualizar'), ('configuracoes.editar')
) AS p(permissao)
WHERE e.tipo = 'TRANSPORTADORA'
AND NOT EXISTS (
  SELECT 1 FROM empresa_cargo_permissoes ecp WHERE ecp.empresa_cargo_id = ecc.id
);

-- Update trigger to also populate permissions on new cargo creation
CREATE OR REPLACE FUNCTION public.fn_create_default_empresa_cargo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_cargo_id uuid;
  empresa_tipo text;
BEGIN
  INSERT INTO empresa_cargos_config (empresa_id, nome, descricao, editavel)
  VALUES (NEW.id, 'ADMIN', 'Administrador da empresa com acesso total', false)
  RETURNING id INTO new_cargo_id;

  SELECT tipo INTO empresa_tipo FROM empresas WHERE id = NEW.id;

  IF empresa_tipo = 'EMBARCADOR' THEN
    INSERT INTO empresa_cargo_permissoes (empresa_cargo_id, permissao, permitido)
    VALUES
      (new_cargo_id, 'cargas.visualizar', false), (new_cargo_id, 'cargas.criar', false), (new_cargo_id, 'cargas.editar', false),
      (new_cargo_id, 'entregas.visualizar', false), (new_cargo_id, 'entregas.finalizar', false),
      (new_cargo_id, 'mensagens.visualizar', false), (new_cargo_id, 'mensagens.enviar', false),
      (new_cargo_id, 'financeiro.visualizar', false), (new_cargo_id, 'financeiro.exportar', false),
      (new_cargo_id, 'relatorios.visualizar', false), (new_cargo_id, 'relatorios.exportar', false),
      (new_cargo_id, 'filiais.visualizar', false), (new_cargo_id, 'filiais.editar', false),
      (new_cargo_id, 'usuarios.visualizar', false), (new_cargo_id, 'usuarios.gerenciar', false), (new_cargo_id, 'usuarios.convidar', false),
      (new_cargo_id, 'configuracoes.visualizar', false), (new_cargo_id, 'configuracoes.editar', false);
  ELSE
    INSERT INTO empresa_cargo_permissoes (empresa_cargo_id, permissao, permitido)
    VALUES
      (new_cargo_id, 'cargas.visualizar', false), (new_cargo_id, 'cargas.criar', false), (new_cargo_id, 'cargas.editar', false),
      (new_cargo_id, 'entregas.visualizar', false), (new_cargo_id, 'entregas.finalizar', false),
      (new_cargo_id, 'frota.visualizar', false), (new_cargo_id, 'frota.editar', false),
      (new_cargo_id, 'motoristas.visualizar', false), (new_cargo_id, 'motoristas.editar', false),
      (new_cargo_id, 'mensagens.visualizar', false), (new_cargo_id, 'mensagens.enviar', false),
      (new_cargo_id, 'financeiro.visualizar', false), (new_cargo_id, 'financeiro.exportar', false),
      (new_cargo_id, 'relatorios.visualizar', false), (new_cargo_id, 'relatorios.exportar', false),
      (new_cargo_id, 'filiais.visualizar', false), (new_cargo_id, 'filiais.editar', false),
      (new_cargo_id, 'usuarios.visualizar', false), (new_cargo_id, 'usuarios.gerenciar', false), (new_cargo_id, 'usuarios.convidar', false),
      (new_cargo_id, 'configuracoes.visualizar', false), (new_cargo_id, 'configuracoes.editar', false);
  END IF;

  RETURN NEW;
END;
$$;
