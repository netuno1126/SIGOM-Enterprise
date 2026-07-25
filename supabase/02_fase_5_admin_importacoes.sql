-- SIGOM Fase 5 — Administração e importações online
-- Idempotente e não destrutivo. Execute no projeto sigom-enterprise.

begin;

-- Chaves naturais usadas pelo upsert das importações.
create unique index if not exists obras_opus_contrato_uq
  on public.obras (opus, contrato);
create unique index if not exists portfolio_obras_opus_contrato_uq
  on public.portfolio_obras (opus, contrato);
create unique index if not exists saldos_alongados_om_ano_uq
  on public.saldos_alongados (om, ano);

-- Autorização centralizada. A função só responde para o próprio usuário autenticado.
create or replace function public.sigom_pode_editar()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.ativo = true
      and p.perfil in ('administrador'::public.perfil_sigom, 'editor'::public.perfil_sigom)
  );
$$;
revoke all on function public.sigom_pode_editar() from public, anon;
grant execute on function public.sigom_pode_editar() to authenticated;

create or replace function public.sigom_eh_administrador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.ativo = true
      and p.perfil = 'administrador'::public.perfil_sigom
  );
$$;
revoke all on function public.sigom_eh_administrador() from public, anon;
grant execute on function public.sigom_eh_administrador() to authenticated;

-- RLS permanece habilitado.
alter table public.obras enable row level security;
alter table public.portfolio_obras enable row level security;
alter table public.saldos_alongados enable row level security;
alter table public.objetivos_auditoria enable row level security;
alter table public.importacoes_planilha enable row level security;
alter table public.grupos enable row level security;
alter table public.grupo_obras enable row level security;
alter table public.auditoria_logs enable row level security;

-- Policies específicas da Fase 5. Policies anteriores podem coexistir.
drop policy if exists fase5_obras_write on public.obras;
create policy fase5_obras_write on public.obras
for all to authenticated
using ((select public.sigom_pode_editar()))
with check ((select public.sigom_pode_editar()));

drop policy if exists fase5_portfolio_write on public.portfolio_obras;
create policy fase5_portfolio_write on public.portfolio_obras
for all to authenticated
using ((select public.sigom_pode_editar()))
with check ((select public.sigom_pode_editar()));

drop policy if exists fase5_saldos_write on public.saldos_alongados;
create policy fase5_saldos_write on public.saldos_alongados
for all to authenticated
using ((select public.sigom_pode_editar()))
with check ((select public.sigom_pode_editar()));

drop policy if exists fase5_objetivos_write on public.objetivos_auditoria;
create policy fase5_objetivos_write on public.objetivos_auditoria
for all to authenticated
using ((select public.sigom_pode_editar()))
with check ((select public.sigom_pode_editar()));

drop policy if exists fase5_importacoes_read on public.importacoes_planilha;
create policy fase5_importacoes_read on public.importacoes_planilha
for select to authenticated
using (true);

drop policy if exists fase5_importacoes_insert on public.importacoes_planilha;
create policy fase5_importacoes_insert on public.importacoes_planilha
for insert to authenticated
with check ((select public.sigom_pode_editar()) and importado_por = (select auth.uid()));

drop policy if exists fase5_importacoes_update on public.importacoes_planilha;
create policy fase5_importacoes_update on public.importacoes_planilha
for update to authenticated
using ((select public.sigom_pode_editar()) and importado_por = (select auth.uid()))
with check ((select public.sigom_pode_editar()) and importado_por = (select auth.uid()));

drop policy if exists fase5_grupos_write on public.grupos;
create policy fase5_grupos_write on public.grupos
for all to authenticated
using ((select public.sigom_pode_editar()))
with check ((select public.sigom_pode_editar()));

drop policy if exists fase5_grupo_obras_write on public.grupo_obras;
create policy fase5_grupo_obras_write on public.grupo_obras
for all to authenticated
using ((select public.sigom_pode_editar()))
with check ((select public.sigom_pode_editar()));

drop policy if exists fase5_auditoria_admin_read on public.auditoria_logs;
create policy fase5_auditoria_admin_read on public.auditoria_logs
for select to authenticated
using ((select public.sigom_eh_administrador()));

-- A Data API precisa de GRANT além de RLS.
grant select, insert, update on public.obras to authenticated;
grant select, insert, update on public.portfolio_obras to authenticated;
grant select, insert, update on public.saldos_alongados to authenticated;
grant select, insert, update on public.objetivos_auditoria to authenticated;
grant select, insert, update on public.importacoes_planilha to authenticated;
grant select, insert, update on public.grupos to authenticated;
grant select, insert, update on public.grupo_obras to authenticated;
grant select on public.auditoria_logs to authenticated;

commit;
