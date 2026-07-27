-- SIGOM Fase 12.5 — Nome Principais Obras por Nº OPUS
-- Idempotente e não destrutivo.
begin;
create extension if not exists pgcrypto;
create table if not exists public.principais_obras (
  id uuid primary key default gen_random_uuid(),
  chave text not null,
  categoria text not null default 'OBRAS EM ANDAMENTO',
  nr_solicitacao text,
  descricao text not null,
  rm text,
  ordem integer not null default 1,
  dados_origem jsonb not null default '{}'::jsonb,
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now()
);
alter table public.principais_obras add column if not exists chave text;
alter table public.principais_obras add column if not exists categoria text;
alter table public.principais_obras add column if not exists nr_solicitacao text;
alter table public.principais_obras add column if not exists descricao text;
alter table public.principais_obras add column if not exists rm text;
alter table public.principais_obras add column if not exists ordem integer default 1;
alter table public.principais_obras add column if not exists dados_origem jsonb default '{}'::jsonb;
alter table public.principais_obras add column if not exists atualizado_por uuid;
alter table public.principais_obras add column if not exists atualizado_em timestamptz default now();
create unique index if not exists principais_obras_chave_uq on public.principais_obras(chave);
create index if not exists principais_obras_opus_idx on public.principais_obras(nr_solicitacao);
create or replace view public.nomes_principais_obras as
select distinct on (regexp_replace(coalesce(nr_solicitacao,''),'\D','','g'))
  regexp_replace(coalesce(nr_solicitacao,''),'\D','','g') as nr_opus,
  descricao as nome_obra, rm, categoria, ordem, atualizado_em
from public.principais_obras
where coalesce(nr_solicitacao,'')<>''
order by regexp_replace(coalesce(nr_solicitacao,''),'\D','','g'),
         case when categoria='OBRAS EM ANDAMENTO' then 0 else 1 end, ordem;
alter table public.principais_obras enable row level security;
drop policy if exists fase125_principais_read on public.principais_obras;
create policy fase125_principais_read on public.principais_obras for select to authenticated using (true);
drop policy if exists fase125_principais_write on public.principais_obras;
create policy fase125_principais_write on public.principais_obras for all to authenticated
using (public.sigom_pode_editar()) with check (public.sigom_pode_editar());
revoke all on public.principais_obras from anon;
grant select,insert,update,delete on public.principais_obras to authenticated;
grant select on public.nomes_principais_obras to authenticated;
commit;
