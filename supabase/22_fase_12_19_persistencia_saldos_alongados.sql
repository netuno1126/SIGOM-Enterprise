-- SIGOM Fase 12.19 — Persistência dos Saldos Alongados
-- Idempotente, não destrutivo e compatível com as migrations anteriores.
begin;

create extension if not exists pgcrypto;

create table if not exists public.saldos_alongados_consolidado (
  id uuid primary key default gen_random_uuid(),
  om text not null,
  saldo_2016 numeric not null default 0,
  saldo_2017 numeric not null default 0,
  saldo_2018 numeric not null default 0,
  saldo_2019 numeric not null default 0,
  saldo_2020 numeric not null default 0,
  saldo_2021 numeric not null default 0,
  saldo_2022 numeric not null default 0,
  saldo_2023 numeric not null default 0,
  saldo_2024 numeric not null default 0,
  saldo_2025 numeric not null default 0,
  saldo_2026 numeric not null default 0,
  total numeric,
  total_informado numeric,
  total_calculado numeric,
  linha_tipo text not null default 'OM',
  ordem integer not null default 1,
  dados_origem jsonb not null default '{}'::jsonb,
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now()
);

alter table public.saldos_alongados_consolidado
  add column if not exists total_informado numeric,
  add column if not exists total_calculado numeric,
  add column if not exists linha_tipo text not null default 'OM',
  add column if not exists ordem integer not null default 1,
  add column if not exists dados_origem jsonb not null default '{}'::jsonb,
  add column if not exists atualizado_por uuid references auth.users(id),
  add column if not exists atualizado_em timestamptz not null default now();

alter table public.saldos_alongados_consolidado alter column total drop not null;

create unique index if not exists saldos_alongados_consolidado_om_uq
  on public.saldos_alongados_consolidado(om);
create index if not exists saldos_alongados_consolidado_ordem_idx
  on public.saldos_alongados_consolidado(ordem);

create table if not exists public.saldos_alongados (
  id uuid primary key default gen_random_uuid(),
  om text not null,
  ano integer not null check (ano between 2016 and 2026),
  valor numeric not null default 0,
  dados jsonb not null default '{}'::jsonb,
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists saldos_alongados_om_ano_uq
  on public.saldos_alongados(om,ano);

create or replace function public.sigom_saldos_consolidado_calcular()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.total_calculado :=
    coalesce(new.saldo_2016,0)+coalesce(new.saldo_2017,0)+
    coalesce(new.saldo_2018,0)+coalesce(new.saldo_2019,0)+
    coalesce(new.saldo_2020,0)+coalesce(new.saldo_2021,0)+
    coalesce(new.saldo_2022,0)+coalesce(new.saldo_2023,0)+
    coalesce(new.saldo_2024,0)+coalesce(new.saldo_2025,0)+
    coalesce(new.saldo_2026,0);

  if new.total_informado is null then
    new.total_informado := coalesce(new.total,new.total_calculado);
  end if;
  new.total := coalesce(new.total_informado,new.total_calculado);
  new.linha_tipo := case
    when upper(trim(new.om))='TOTAL' then 'TOTAL'
    when upper(trim(new.om))='EB' then 'EB'
    when upper(trim(new.om))='TEREO' then 'TEREO'
    else coalesce(nullif(new.linha_tipo,''),'OM')
  end;
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_sigom_saldos_consolidado_calcular
  on public.saldos_alongados_consolidado;
create trigger trg_sigom_saldos_consolidado_calcular
before insert or update on public.saldos_alongados_consolidado
for each row execute function public.sigom_saldos_consolidado_calcular();

create or replace view public.saldos_alongados_oficial
with (security_invoker=true)
as
select om,2016 as ano,saldo_2016 as valor from public.saldos_alongados_consolidado union all
select om,2017,saldo_2017 from public.saldos_alongados_consolidado union all
select om,2018,saldo_2018 from public.saldos_alongados_consolidado union all
select om,2019,saldo_2019 from public.saldos_alongados_consolidado union all
select om,2020,saldo_2020 from public.saldos_alongados_consolidado union all
select om,2021,saldo_2021 from public.saldos_alongados_consolidado union all
select om,2022,saldo_2022 from public.saldos_alongados_consolidado union all
select om,2023,saldo_2023 from public.saldos_alongados_consolidado union all
select om,2024,saldo_2024 from public.saldos_alongados_consolidado union all
select om,2025,saldo_2025 from public.saldos_alongados_consolidado union all
select om,2026,saldo_2026 from public.saldos_alongados_consolidado;

alter table public.saldos_alongados_consolidado enable row level security;
alter table public.saldos_alongados enable row level security;

drop policy if exists fase12_19_saldos_consolidado_read on public.saldos_alongados_consolidado;
drop policy if exists fase12_19_saldos_consolidado_write on public.saldos_alongados_consolidado;
create policy fase12_19_saldos_consolidado_read
on public.saldos_alongados_consolidado for select to authenticated using (true);
create policy fase12_19_saldos_consolidado_write
on public.saldos_alongados_consolidado for all to authenticated
using ((select public.sigom_pode_editar()))
with check ((select public.sigom_pode_editar()));

drop policy if exists fase12_19_saldos_read on public.saldos_alongados;
drop policy if exists fase12_19_saldos_write on public.saldos_alongados;
create policy fase12_19_saldos_read
on public.saldos_alongados for select to authenticated using (true);
create policy fase12_19_saldos_write
on public.saldos_alongados for all to authenticated
using ((select public.sigom_pode_editar()))
with check ((select public.sigom_pode_editar()));

revoke all on table public.saldos_alongados_consolidado from anon;
revoke all on table public.saldos_alongados from anon;
revoke all on table public.saldos_alongados_oficial from anon;
grant select,insert,update on table public.saldos_alongados_consolidado to authenticated;
grant select,insert,update,delete on table public.saldos_alongados to authenticated;
grant select on table public.saldos_alongados_oficial to authenticated;

commit;

-- Verificação: os resultados devem permanecer iguais após sair e entrar novamente.
select count(*) as linhas_consolidadas from public.saldos_alongados_consolidado;
select count(*) as linhas_anuais from public.saldos_alongados;
