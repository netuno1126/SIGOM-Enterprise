-- SIGOM — Fase 12.34 Institucional
-- Indicadores executivos do Objetivo 05
-- Não remove nem altera dados existentes.

begin;

create table if not exists public.objetivo5_indicadores_historico (
  id uuid primary key default gen_random_uuid(),
  data_referencia date not null,
  total integer not null default 0,
  localizadas integer not null default 0,
  recontratadas integer not null default 0,
  em_andamento integer not null default 0,
  pendentes integer not null default 0,
  percentual_localizadas numeric(10,4),
  percentual_recontratadas numeric(10,4),
  percentual_pendentes numeric(10,4),
  registrado_por uuid references auth.users(id) on delete set null,
  registrado_por_nome text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint objetivo5_indicadores_historico_data_uk unique(data_referencia)
);

create index if not exists objetivo5_indicadores_historico_data_idx
  on public.objetivo5_indicadores_historico(data_referencia desc);

alter table public.objetivo5_indicadores_historico enable row level security;

drop policy if exists objetivo5_indicadores_select on public.objetivo5_indicadores_historico;
create policy objetivo5_indicadores_select
on public.objetivo5_indicadores_historico for select
to authenticated using (true);

drop policy if exists objetivo5_indicadores_insert on public.objetivo5_indicadores_historico;
create policy objetivo5_indicadores_insert
on public.objetivo5_indicadores_historico for insert
to authenticated with check ((select public.sigom_pode_editar()));

drop policy if exists objetivo5_indicadores_update on public.objetivo5_indicadores_historico;
create policy objetivo5_indicadores_update
on public.objetivo5_indicadores_historico for update
to authenticated using ((select public.sigom_pode_editar()))
with check ((select public.sigom_pode_editar()));

grant select on public.objetivo5_indicadores_historico to authenticated;
grant insert, update on public.objetivo5_indicadores_historico to authenticated;
revoke all on public.objetivo5_indicadores_historico from anon;

commit;
