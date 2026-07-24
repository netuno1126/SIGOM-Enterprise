-- SIGOM 2026 — V31.0 GOLD.1
-- Verificação das permissões das funções SECURITY DEFINER

select
  n.nspname as schema,
  p.proname as funcao,
  pg_get_function_identity_arguments(p.oid) as argumentos,
  p.prosecdef as security_definer,
  p.proconfig as configuracao,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_executa,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as autenticado_executa,
  has_function_privilege('public', p.oid, 'EXECUTE') as public_executa
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'handle_new_user',
    'meu_perfil',
    'pode_editar',
    'pode_auditar',
    'registrar_importacao_auditoria',
    'audit_grupos_v30_2',
    'audit_grupo_obras_v30_2',
    'registrar_fio_auditoria',
    'rls_auto_enable'
  )
order by p.proname;
