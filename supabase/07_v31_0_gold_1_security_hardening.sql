-- SIGOM 2026 — V31.0 GOLD.1
-- Hardening das funções SECURITY DEFINER
--
-- OBJETIVO
-- 1. Impedir chamada direta por PUBLIC/anon de funções privilegiadas.
-- 2. Manter somente as funções de autorização disponíveis para usuários autenticados.
-- 3. Preservar funções de trigger para execução interna pelos gatilhos.
-- 4. Fixar explicitamente o search_path.
--
-- Pode ser executado mais de uma vez.
-- Execute depois dos scripts 01, 03, 04 e 05.
--
-- CORREÇÃO (v2): "ALTER FUNCTION ... IF EXISTS" não existe no Postgres —
-- só DROP/ALTER TABLE aceitam essa cláusula. Cada função agora é alterada
-- dentro de um bloco DO, verificando antes com to_regprocedure() se ela
-- existe (mesmo padrão já usado abaixo para a função opcional
-- rls_auto_enable). Isso evita o erro de sintaxe e também não quebra caso
-- alguma função ainda não tenha sido criada.

begin;

-- ---------------------------------------------------------------------------
-- 1. Funções auxiliares usadas pelas políticas RLS e pelo frontend
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regprocedure('public.meu_perfil()') is not null then
    execute 'alter function public.meu_perfil() set search_path = public, pg_temp';
    execute 'revoke all on function public.meu_perfil() from public';
    execute 'revoke all on function public.meu_perfil() from anon';
    execute 'revoke all on function public.meu_perfil() from authenticated';
    execute 'grant execute on function public.meu_perfil() to authenticated';
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.pode_editar()') is not null then
    execute 'alter function public.pode_editar() set search_path = public, pg_temp';
    execute 'revoke all on function public.pode_editar() from public';
    execute 'revoke all on function public.pode_editar() from anon';
    execute 'revoke all on function public.pode_editar() from authenticated';
    execute 'grant execute on function public.pode_editar() to authenticated';
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.pode_auditar()') is not null then
    execute 'alter function public.pode_auditar() set search_path = public, pg_temp';
    execute 'revoke all on function public.pode_auditar() from public';
    execute 'revoke all on function public.pode_auditar() from anon';
    execute 'revoke all on function public.pode_auditar() from authenticated';
    execute 'grant execute on function public.pode_auditar() to authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Funções de trigger: não devem ser invocadas diretamente por clientes
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regprocedure('public.handle_new_user()') is not null then
    execute 'alter function public.handle_new_user() set search_path = public, pg_temp';
    execute 'revoke all on function public.handle_new_user() from public';
    execute 'revoke all on function public.handle_new_user() from anon';
    execute 'revoke all on function public.handle_new_user() from authenticated';
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.registrar_importacao_auditoria()') is not null then
    execute 'alter function public.registrar_importacao_auditoria() set search_path = public, pg_temp';
    execute 'revoke all on function public.registrar_importacao_auditoria() from public';
    execute 'revoke all on function public.registrar_importacao_auditoria() from anon';
    execute 'revoke all on function public.registrar_importacao_auditoria() from authenticated';
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.audit_grupos_v30_2()') is not null then
    execute 'alter function public.audit_grupos_v30_2() set search_path = public, pg_temp';
    execute 'revoke all on function public.audit_grupos_v30_2() from public';
    execute 'revoke all on function public.audit_grupos_v30_2() from anon';
    execute 'revoke all on function public.audit_grupos_v30_2() from authenticated';
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.audit_grupo_obras_v30_2()') is not null then
    execute 'alter function public.audit_grupo_obras_v30_2() set search_path = public, pg_temp';
    execute 'revoke all on function public.audit_grupo_obras_v30_2() from public';
    execute 'revoke all on function public.audit_grupo_obras_v30_2() from anon';
    execute 'revoke all on function public.audit_grupo_obras_v30_2() from authenticated';
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.registrar_fio_auditoria()') is not null then
    execute 'alter function public.registrar_fio_auditoria() set search_path = public, pg_temp';
    execute 'revoke all on function public.registrar_fio_auditoria() from public';
    execute 'revoke all on function public.registrar_fio_auditoria() from anon';
    execute 'revoke all on function public.registrar_fio_auditoria() from authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Função opcional encontrada em algumas instalações
-- ---------------------------------------------------------------------------
-- O bloco abaixo só atua se a função public.rls_auto_enable() existir.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'alter function public.rls_auto_enable() set search_path = public, pg_temp';
    execute 'revoke all on function public.rls_auto_enable() from public';
    execute 'revoke all on function public.rls_auto_enable() from anon';
    execute 'revoke all on function public.rls_auto_enable() from authenticated';
  end if;
end $$;

commit;

-- Após executar:
-- Supabase > Database > Advisors > Security Advisor > Atualizar/Reprise Linter.
