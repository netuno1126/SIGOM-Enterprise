-- SIGOM Fase 12.1 — Estruturas oficiais de Portfólio, Principais Obras e Saldos Alongados
-- Não destrutivo e compatível com as fases anteriores.
begin;
create extension if not exists pgcrypto;

-- ============================================================
-- 1. PORTFÓLIO — MESMA ESTRUTURA LÓGICA DA PLANILHA OFICIAL
-- ============================================================
create table if not exists public.portfolio_obras (
  id uuid primary key default gen_random_uuid()
);

alter table public.portfolio_obras
  add column if not exists obra_id uuid,
  add column if not exists rm text,
  add column if not exists contratante text,
  add column if not exists om_beneficiada text,
  add column if not exists nr_contrato text,
  add column if not exists nr_solicitacao text,
  add column if not exists empresa text,
  add column if not exists descricao_solicitacao text,
  add column if not exists percentual_estimado numeric,
  add column if not exists percentual_medido numeric,
  add column if not exists valor_solicitacao numeric,
  add column if not exists valor_contratado numeric,
  add column if not exists acoes_financeiras text,
  add column if not exists inicio_os date,
  add column if not exists fim_prazo date,
  add column if not exists fim_vigencia date,
  add column if not exists percentual_quarta numeric,
  add column if not exists data_quarta date,
  add column if not exists percentual_antepenultima numeric,
  add column if not exists data_antepenultima date,
  add column if not exists percentual_penultima numeric,
  add column if not exists data_penultima date,
  add column if not exists percentual_ultima numeric,
  add column if not exists data_ultima date,
  add column if not exists valor_inicial numeric,
  add column if not exists valor_aditivado numeric,
  add column if not exists valor_apostilado numeric,
  add column if not exists valor_atual numeric,
  add column if not exists total_nc numeric,
  add column if not exists total_ne numeric,
  add column if not exists percentual_empenhado numeric,
  add column if not exists falta_empenhar numeric,
  add column if not exists total_notas_fiscais numeric,
  add column if not exists prazo_contratado integer,
  add column if not exists prazo_aditivo integer,
  add column if not exists prazo_total integer,
  add column if not exists vigencia_contratado integer,
  add column if not exists vigencia_aditivado integer,
  add column if not exists vigencia_total integer,
  add column if not exists termino_vigencia date,
  add column if not exists saldo_descentralizar numeric,
  add column if not exists acao_orcamentaria text,
  add column if not exists idp numeric,
  add column if not exists data_projetada date,
  add column if not exists obs text,
  add column if not exists dias_atrasados integer,
  add column if not exists percentual_atraso numeric,
  add column if not exists media_medicao_3 numeric,
  add column if not exists media_mensal_global numeric,
  add column if not exists analise text,
  add column if not exists media_90_dias numeric,
  add column if not exists saldo_empenho numeric,
  add column if not exists dados_origem jsonb not null default '{}'::jsonb,
  add column if not exists origem_importacao_id uuid,
  add column if not exists atualizado_por uuid,
  add column if not exists atualizado_em timestamptz not null default now();

-- aliases de compatibilidade das fases anteriores
alter table public.portfolio_obras
  add column if not exists opus text,
  add column if not exists contrato text,
  add column if not exists descricao text,
  add column if not exists nome_obra text,
  add column if not exists total_nf numeric,
  add column if not exists dados jsonb not null default '{}'::jsonb;

create or replace function public.sigom_portfolio_calcular()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.nr_solicitacao := coalesce(nullif(new.nr_solicitacao,''), nullif(new.opus,''));
  new.nr_contrato := coalesce(nullif(new.nr_contrato,''), nullif(new.contrato,''));
  new.descricao_solicitacao := coalesce(nullif(new.descricao_solicitacao,''), nullif(new.descricao,''), nullif(new.nome_obra,''));
  new.opus := new.nr_solicitacao;
  new.contrato := new.nr_contrato;
  new.descricao := new.descricao_solicitacao;
  new.nome_obra := new.descricao_solicitacao;
  new.total_notas_fiscais := coalesce(new.total_notas_fiscais,new.total_nf);
  new.total_nf := new.total_notas_fiscais;
  new.dados_origem := coalesce(new.dados_origem,new.dados,'{}'::jsonb);
  new.dados := new.dados_origem;

  if new.valor_atual is null and (new.valor_inicial is not null or new.valor_aditivado is not null or new.valor_apostilado is not null) then
    new.valor_atual := coalesce(new.valor_inicial,0)+coalesce(new.valor_aditivado,0)+coalesce(new.valor_apostilado,0);
  end if;
  if coalesce(new.valor_atual,0) <> 0 then
    new.percentual_empenhado := coalesce(new.total_ne,0)/new.valor_atual*100;
    new.falta_empenhar := new.valor_atual-coalesce(new.total_ne,0);
  end if;
  new.saldo_empenho := coalesce(new.total_ne,0)-coalesce(new.total_notas_fiscais,0);
  new.prazo_total := coalesce(new.prazo_contratado,0)+coalesce(new.prazo_aditivo,0);
  new.vigencia_total := coalesce(new.vigencia_contratado,0)+coalesce(new.vigencia_aditivado,0);
  -- Regra institucional definida pelo usuário: IDP = % medido / % estimado
  if coalesce(new.percentual_estimado,0) <> 0 then
    new.idp := new.percentual_medido/new.percentual_estimado;
  else
    new.idp := null;
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_sigom_portfolio_calcular on public.portfolio_obras;
create trigger trg_sigom_portfolio_calcular
before insert or update on public.portfolio_obras
for each row execute function public.sigom_portfolio_calcular();

create unique index if not exists portfolio_obras_solicitacao_contrato_uq
  on public.portfolio_obras(nr_solicitacao,nr_contrato)
  where nr_solicitacao is not null and nr_solicitacao<>'';
create index if not exists portfolio_obras_rm_idx on public.portfolio_obras(rm);
create index if not exists portfolio_obras_empresa_idx on public.portfolio_obras(empresa);

-- ============================================================
-- 2. PRINCIPAIS OBRAS — ESTRUTURA OFICIAL DO ARQUIVO AUXILIAR
-- ============================================================
create table if not exists public.principais_obras (
  id uuid primary key default gen_random_uuid(),
  chave text not null,
  categoria text not null check (categoria in ('OBRAS EM ANDAMENTO','FUTURAS OBRAS')),
  nr_solicitacao text,
  descricao text not null,
  rm text,
  ordem integer not null default 1,
  dados_origem jsonb not null default '{}'::jsonb,
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists principais_obras_chave_uq on public.principais_obras(chave);
create index if not exists principais_obras_categoria_ordem_idx on public.principais_obras(categoria,ordem);

-- ============================================================
-- 3. SALDOS ALONGADOS — ESTRUTURA CONSOLIDADA OFICIAL (2016–2026)
-- ============================================================
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
  total numeric not null default 0,
  dados_origem jsonb not null default '{}'::jsonb,
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists saldos_alongados_consolidado_om_uq on public.saldos_alongados_consolidado(om);

create or replace function public.sigom_saldos_consolidado_calcular()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.total := coalesce(new.saldo_2016,0)+coalesce(new.saldo_2017,0)+coalesce(new.saldo_2018,0)+
               coalesce(new.saldo_2019,0)+coalesce(new.saldo_2020,0)+coalesce(new.saldo_2021,0)+
               coalesce(new.saldo_2022,0)+coalesce(new.saldo_2023,0)+coalesce(new.saldo_2024,0)+
               coalesce(new.saldo_2025,0)+coalesce(new.saldo_2026,0);
  new.atualizado_em := now();
  return new;
end;
$$;
drop trigger if exists trg_sigom_saldos_consolidado_calcular on public.saldos_alongados_consolidado;
create trigger trg_sigom_saldos_consolidado_calcular
before insert or update on public.saldos_alongados_consolidado
for each row execute function public.sigom_saldos_consolidado_calcular();

-- Tabela longa mantida para gráficos e compatibilidade
create table if not exists public.saldos_alongados (
  id uuid primary key default gen_random_uuid(),
  om text not null,
  ano integer not null,
  valor numeric not null default 0,
  dados jsonb not null default '{}'::jsonb,
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists saldos_alongados_om_ano_uq on public.saldos_alongados(om,ano);

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

-- ============================================================
-- 4. RLS E PERMISSÕES
-- ============================================================
alter table public.portfolio_obras enable row level security;
alter table public.principais_obras enable row level security;
alter table public.saldos_alongados_consolidado enable row level security;
alter table public.saldos_alongados enable row level security;

drop policy if exists fase12_1_portfolio_read on public.portfolio_obras;
create policy fase12_1_portfolio_read on public.portfolio_obras for select to authenticated using (true);
drop policy if exists fase12_1_portfolio_write on public.portfolio_obras;
create policy fase12_1_portfolio_write on public.portfolio_obras for all to authenticated
using (public.sigom_pode_editar()) with check (public.sigom_pode_editar());

drop policy if exists fase12_1_principais_read on public.principais_obras;
create policy fase12_1_principais_read on public.principais_obras for select to authenticated using (true);
drop policy if exists fase12_1_principais_write on public.principais_obras;
create policy fase12_1_principais_write on public.principais_obras for all to authenticated
using (public.sigom_pode_editar()) with check (public.sigom_pode_editar());

drop policy if exists fase12_1_saldos_consolidado_read on public.saldos_alongados_consolidado;
create policy fase12_1_saldos_consolidado_read on public.saldos_alongados_consolidado for select to authenticated using (true);
drop policy if exists fase12_1_saldos_consolidado_write on public.saldos_alongados_consolidado;
create policy fase12_1_saldos_consolidado_write on public.saldos_alongados_consolidado for all to authenticated
using (public.sigom_pode_editar()) with check (public.sigom_pode_editar());

drop policy if exists fase12_1_saldos_read on public.saldos_alongados;
create policy fase12_1_saldos_read on public.saldos_alongados for select to authenticated using (true);
drop policy if exists fase12_1_saldos_write on public.saldos_alongados;
create policy fase12_1_saldos_write on public.saldos_alongados for all to authenticated
using (public.sigom_pode_editar()) with check (public.sigom_pode_editar());

revoke all on public.portfolio_obras,public.principais_obras,public.saldos_alongados_consolidado,public.saldos_alongados from anon;
grant select,insert,update on public.portfolio_obras,public.principais_obras,public.saldos_alongados_consolidado,public.saldos_alongados to authenticated;
grant delete on public.principais_obras to authenticated;
grant select on public.saldos_alongados_oficial to authenticated;
commit;
