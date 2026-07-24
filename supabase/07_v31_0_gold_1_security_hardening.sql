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

begin;

-- ---------------------------------------------------------------------------
-- 1. Funções auxiliares usadas pelas políticas RLS e pelo frontend
-- ---------------------------------------------------------------------------

alter function if exists public.meu_perfil() set search_path = public, pg_temp;
alter function if exists public.pode_editar() set search_path = public, pg_temp;
alter function if exists public.pode_auditar() set search_path = public, pg_temp;

revoke all on function public.meu_perfil() from public;
revoke all on function public.meu_perfil() from anon;
revoke all on function public.meu_perfil() from authenticated;
grant execute on function public.meu_perfil() to authenticated;

revoke all on function public.pode_editar() from public;
revoke all on function public.pode_editar() from anon;
revoke all on function public.pode_editar() from authenticated;
grant execute on function public.pode_editar() to authenticated;

revoke all on function public.pode_auditar() from public;
revoke all on function public.pode_auditar() from anon;
revoke all on function public.pode_auditar() from authenticated;
grant execute on function public.pode_auditar() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Funções de trigger: não devem ser invocadas diretamente por clientes
-- ---------------------------------------------------------------------------

alter function if exists public.handle_new_user() set search_path = public, pg_temp;
alter function if exists public.registrar_importacao_auditoria() set search_path = public, pg_temp;
alter function if exists public.audit_grupos_v30_2() set search_path = public, pg_temp;
alter function if exists public.audit_grupo_obras_v30_2() set search_path = public, pg_temp;
alter function if exists public.registrar_fio_auditoria() set search_path = public, pg_temp;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

revoke all on function public.registrar_importacao_auditoria() from public;
revoke all on function public.registrar_importacao_auditoria() from anon;
revoke all on function public.registrar_importacao_auditoria() from authenticated;

revoke all on function public.audit_grupos_v30_2() from public;
revoke all on function public.audit_grupos_v30_2() from anon;
revoke all on function public.audit_grupos_v30_2() from authenticated;

revoke all on function public.audit_grupo_obras_v30_2() from public;
revoke all on function public.audit_grupo_obras_v30_2() from anon;
revoke all on function public.audit_grupo_obras_v30_2() from authenticated;

revoke all on function public.registrar_fio_auditoria() from public;
revoke all on function public.registrar_fio_auditoria() from anon;
revoke all on function public.registrar_fio_auditoria() from authenticated;

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
