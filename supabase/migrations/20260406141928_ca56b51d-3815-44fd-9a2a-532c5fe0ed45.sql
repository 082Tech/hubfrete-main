
-- Backfill usuario_nome from usuarios table
UPDATE public.auditoria_logs al
SET usuario_nome = u.nome
FROM public.usuarios u
WHERE al.usuario_id = u.auth_user_id
  AND al.usuario_nome IS NULL;

-- Backfill usuario_nome from torre_users table (for admin users not in usuarios)
UPDATE public.auditoria_logs al
SET usuario_nome = tu.nome
FROM public.torre_users tu
WHERE al.usuario_id = tu.user_id
  AND al.usuario_nome IS NULL;

-- Backfill registro_codigo from entregas
UPDATE public.auditoria_logs al
SET registro_codigo = e.codigo
FROM public.entregas e
WHERE al.tabela = 'entregas'
  AND al.registro_id = e.id::text
  AND al.registro_codigo IS NULL
  AND e.codigo IS NOT NULL;

-- Backfill registro_codigo from cargas
UPDATE public.auditoria_logs al
SET registro_codigo = c.codigo
FROM public.cargas c
WHERE al.tabela = 'cargas'
  AND al.registro_id = c.id::text
  AND al.registro_codigo IS NULL;

-- Backfill registro_codigo from viagens
UPDATE public.auditoria_logs al
SET registro_codigo = v.codigo
FROM public.viagens v
WHERE al.tabela = 'viagens'
  AND al.registro_id = v.id::text
  AND al.registro_codigo IS NULL;

-- Backfill registro_codigo from chamados
UPDATE public.auditoria_logs al
SET registro_codigo = ch.codigo
FROM public.chamados ch
WHERE al.tabela = 'chamados'
  AND al.registro_id = ch.id::text
  AND al.registro_codigo IS NULL;

-- Backfill descricao for all existing logs that don't have one
UPDATE public.auditoria_logs
SET descricao = CASE operacao
    WHEN 'INSERT' THEN 'Criou registro em ' || tabela || COALESCE(' (' || registro_codigo || ')', '')
    WHEN 'UPDATE' THEN 'Atualizou registro em ' || tabela || COALESCE(' (' || registro_codigo || ')', '')
    WHEN 'DELETE' THEN 'Removeu registro de ' || tabela || COALESCE(' (' || registro_codigo || ')', '')
    ELSE operacao || ' em ' || tabela
  END
WHERE descricao IS NULL;
