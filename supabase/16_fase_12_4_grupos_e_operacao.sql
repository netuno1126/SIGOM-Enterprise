-- SIGOM Fase 12.4 — Grupos no Supabase e correções operacionais
begin;
alter table public.grupos enable row level security;
alter table public.grupo_obras enable row level security;
drop policy if exists fase12_4_grupos_read on public.grupos;
create policy fase12_4_grupos_read on public.grupos for select to authenticated using (true);
drop policy if exists fase12_4_grupo_obras_read on public.grupo_obras;
create policy fase12_4_grupo_obras_read on public.grupo_obras for select to authenticated using (true);
drop policy if exists fase12_4_grupos_write on public.grupos;
create policy fase12_4_grupos_write on public.grupos for all to authenticated
using ((select public.sigom_pode_editar())) with check ((select public.sigom_pode_editar()));
drop policy if exists fase12_4_grupo_obras_write on public.grupo_obras;
create policy fase12_4_grupo_obras_write on public.grupo_obras for all to authenticated
using ((select public.sigom_pode_editar())) with check ((select public.sigom_pode_editar()));
grant select,insert,update,delete on public.grupos to authenticated;
grant select,insert,update,delete on public.grupo_obras to authenticated;
commit;
