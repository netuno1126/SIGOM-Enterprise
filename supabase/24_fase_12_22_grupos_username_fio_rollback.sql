begin;

update public.profiles p
set username = 'fabiobarboza.dom'
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('fabiobarboza.dom@gmail.com')
  and (p.username is null or btrim(p.username) = '');

create or replace function public.sigom_pode_editar()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.perfil in ('administrador'::public.perfil_sigom, 'editor'::public.perfil_sigom)
  );
$$;

revoke all on function public.sigom_pode_editar() from public, anon;
grant execute on function public.sigom_pode_editar() to authenticated;

drop policy if exists fase12_4_grupo_obras_read on public.grupo_obras;
drop policy if exists fase12_4_grupo_obras_write on public.grupo_obras;
drop policy if exists fase5_grupo_obras_write on public.grupo_obras;
drop policy if exists grupo_obras_read on public.grupo_obras;
drop policy if exists grupo_obras_write on public.grupo_obras;
drop policy if exists sigom_grupo_obras_select on public.grupo_obras;
drop policy if exists sigom_grupo_obras_insert on public.grupo_obras;
drop policy if exists sigom_grupo_obras_update on public.grupo_obras;
drop policy if exists sigom_grupo_obras_delete on public.grupo_obras;

alter table public.grupo_obras enable row level security;

create policy sigom_grupo_obras_select on public.grupo_obras
for select to authenticated using (true);

create policy sigom_grupo_obras_insert on public.grupo_obras
for insert to authenticated
with check (public.sigom_pode_editar() and coalesce(adicionado_por, auth.uid()) = auth.uid());

create policy sigom_grupo_obras_update on public.grupo_obras
for update to authenticated
using (public.sigom_pode_editar())
with check (public.sigom_pode_editar());

create policy sigom_grupo_obras_delete on public.grupo_obras
for delete to authenticated
using (public.sigom_pode_editar());

revoke all on table public.grupo_obras from anon, public;
grant select, insert, update, delete on table public.grupo_obras to authenticated;

drop policy if exists fase12_4_grupos_read on public.grupos;
drop policy if exists fase12_4_grupos_write on public.grupos;
drop policy if exists fase5_grupos_write on public.grupos;
drop policy if exists grupos_read on public.grupos;
drop policy if exists grupos_write on public.grupos;
drop policy if exists sigom_grupos_select on public.grupos;
drop policy if exists sigom_grupos_insert on public.grupos;
drop policy if exists sigom_grupos_update on public.grupos;
drop policy if exists sigom_grupos_delete on public.grupos;

alter table public.grupos enable row level security;

create policy sigom_grupos_select on public.grupos
for select to authenticated using (true);
create policy sigom_grupos_insert on public.grupos
for insert to authenticated with check (public.sigom_pode_editar());
create policy sigom_grupos_update on public.grupos
for update to authenticated
using (public.sigom_pode_editar()) with check (public.sigom_pode_editar());
create policy sigom_grupos_delete on public.grupos
for delete to authenticated using (public.sigom_pode_editar());

revoke all on table public.grupos from anon, public;
grant select, insert, update, delete on table public.grupos to authenticated;

commit;
