-- SIGOM Fase 12 — Modelo de Dados Definitivo e Motor de Fórmulas
-- Referência: Planilha de Obras_Dash.xlsx / aba Portfolio / 51 colunas.
-- Regra institucional do IDP: percentual_medido / percentual_estimado.
-- Script idempotente e não destrutivo: não remove dados existentes.

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- 1. COMPLEMENTAR A TABELA PUBLIC.OBRAS
-- ============================================================

alter table public.obras
  add column if not exists nr_contrato text,
  add column if not exists nr_solicitacao text,
  add column if not exists descricao_solicitacao text,
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
  add column if not exists total_nc numeric,
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
  add column if not exists dados_origem jsonb,
  add column if not exists formula_versao text default 'F12.0',
  add column if not exists calculado_em timestamptz;

-- Compatibilidade com nomes já usados nas fases anteriores.
update public.obras
set
  nr_contrato = coalesce(nr_contrato, contrato),
  nr_solicitacao = coalesce(nr_solicitacao, opus),
  descricao_solicitacao = coalesce(descricao_solicitacao, descricao),
  total_notas_fiscais = coalesce(total_notas_fiscais, total_nf),
  dados_origem = coalesce(dados_origem, dados)
where
  nr_contrato is null
  or nr_solicitacao is null
  or descricao_solicitacao is null
  or total_notas_fiscais is null
  or dados_origem is null;

-- ============================================================
-- 2. MOTOR OFICIAL DE FÓRMULAS
-- ============================================================

create or replace function public.sigom_recalcular_indicadores_obra()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- Sincronização dos aliases usados pelas telas antigas.
  new.contrato := coalesce(nullif(new.contrato, ''), new.nr_contrato);
  new.nr_contrato := coalesce(nullif(new.nr_contrato, ''), new.contrato);
  new.opus := coalesce(nullif(new.opus, ''), new.nr_solicitacao);
  new.nr_solicitacao := coalesce(nullif(new.nr_solicitacao, ''), new.opus);
  new.descricao := coalesce(nullif(new.descricao, ''), new.descricao_solicitacao);
  new.descricao_solicitacao := coalesce(nullif(new.descricao_solicitacao, ''), new.descricao);

  -- Valor Atual: somente calcula quando não veio informado pela fonte.
  if new.valor_atual is null then
    new.valor_atual := coalesce(new.valor_inicial, 0)
                     + coalesce(new.valor_aditivado, 0)
                     + coalesce(new.valor_apostilado, 0);
  end if;

  -- Total de notas fiscais mantém compatibilidade com total_nf.
  new.total_notas_fiscais := coalesce(new.total_notas_fiscais, new.total_nf, 0);
  new.total_nf := coalesce(new.total_nf, new.total_notas_fiscais, 0);

  -- Fórmulas financeiras.
  new.percentual_empenhado := case
    when coalesce(new.valor_atual, 0) <> 0
      then coalesce(new.total_ne, 0) / new.valor_atual * 100
    else null
  end;

  new.falta_empenhar := coalesce(new.valor_atual, 0) - coalesce(new.total_ne, 0);
  new.saldo_empenho := coalesce(new.total_ne, 0) - coalesce(new.total_notas_fiscais, 0);

  -- Prazos e vigências.
  new.prazo_total := coalesce(new.prazo_contratado, 0) + coalesce(new.prazo_aditivo, 0);
  new.vigencia_total := coalesce(new.vigencia_contratado, 0) + coalesce(new.vigencia_aditivado, 0);
  new.termino_vigencia := coalesce(new.termino_vigencia, new.fim_vigencia);

  -- IDP OFICIAL DA FASE 12: % medido / % estimado.
  new.idp := case
    when coalesce(new.percentual_estimado, 0) > 0
      then new.percentual_medido / new.percentual_estimado
    else null
  end;

  new.formula_versao := 'F12.0';
  new.calculado_em := now();
  new.dados_origem := coalesce(new.dados_origem, new.dados);

  return new;
end;
$$;

drop trigger if exists trg_sigom_recalcular_indicadores_obra on public.obras;
create trigger trg_sigom_recalcular_indicadores_obra
before insert or update of
  contrato, nr_contrato, opus, nr_solicitacao, descricao, descricao_solicitacao,
  valor_inicial, valor_aditivado, valor_apostilado, valor_atual,
  total_ne, total_nf, total_notas_fiscais,
  percentual_medido, percentual_estimado,
  prazo_contratado, prazo_aditivo,
  vigencia_contratado, vigencia_aditivado,
  fim_vigencia, termino_vigencia,
  dados, dados_origem
on public.obras
for each row execute function public.sigom_recalcular_indicadores_obra();

-- Recalcula os registros atuais sem alterar dados de origem.
update public.obras
set percentual_medido = percentual_medido;

-- ============================================================
-- 3. HISTÓRICO DE MEDIÇÕES
-- ============================================================

create table if not exists public.obras_medicoes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  sequencia integer,
  tipo_referencia text,
  data_medicao date,
  percentual_medido numeric,
  valor_medicao numeric,
  origem text,
  importacao_id uuid,
  dados_origem jsonb,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

create unique index if not exists obras_medicoes_obra_data_tipo_uidx
on public.obras_medicoes(obra_id, data_medicao, tipo_referencia)
where data_medicao is not null;

create index if not exists obras_medicoes_obra_data_idx
on public.obras_medicoes(obra_id, data_medicao desc);

alter table public.obras_medicoes enable row level security;

drop policy if exists fase12_medicoes_read on public.obras_medicoes;
create policy fase12_medicoes_read
on public.obras_medicoes for select to authenticated using (true);

drop policy if exists fase12_medicoes_write on public.obras_medicoes;
create policy fase12_medicoes_write
on public.obras_medicoes for all to authenticated
using (public.sigom_pode_editar())
with check (public.sigom_pode_editar());

revoke all on public.obras_medicoes from anon;
grant select, insert, update, delete on public.obras_medicoes to authenticated;

-- Importa para o histórico as quatro medições atualmente disponíveis na planilha.
insert into public.obras_medicoes
  (obra_id, sequencia, tipo_referencia, data_medicao, percentual_medido, origem, dados_origem)
select id, 1, 'quarta', data_quarta, percentual_quarta, 'Planilha de Obras_Dash', dados_origem
from public.obras
where data_quarta is not null and percentual_quarta is not null
on conflict do nothing;

insert into public.obras_medicoes
  (obra_id, sequencia, tipo_referencia, data_medicao, percentual_medido, origem, dados_origem)
select id, 2, 'antepenultima', data_antepenultima, percentual_antepenultima, 'Planilha de Obras_Dash', dados_origem
from public.obras
where data_antepenultima is not null and percentual_antepenultima is not null
on conflict do nothing;

insert into public.obras_medicoes
  (obra_id, sequencia, tipo_referencia, data_medicao, percentual_medido, origem, dados_origem)
select id, 3, 'penultima', data_penultima, percentual_penultima, 'Planilha de Obras_Dash', dados_origem
from public.obras
where data_penultima is not null and percentual_penultima is not null
on conflict do nothing;

insert into public.obras_medicoes
  (obra_id, sequencia, tipo_referencia, data_medicao, percentual_medido, origem, dados_origem)
select id, 4, 'ultima', data_ultima, percentual_ultima, 'Planilha de Obras_Dash', dados_origem
from public.obras
where data_ultima is not null and percentual_ultima is not null
on conflict do nothing;

-- ============================================================
-- 4. VIEW OFICIAL PARA DASHBOARD, ALERTAS E IA
-- ============================================================

create or replace view public.obras_indicadores
with (security_invoker = true)
as
select
  o.*,
  case
    when o.idp is null then 'Sem estimativa'
    when o.idp < 0.70 then 'Crítica'
    when o.idp < 0.85 then 'Atenção'
    when o.idp <= 1.00 then 'Adequada'
    else 'Adiantada'
  end as classificacao_idp,
  case
    when o.data_ultima is null then null
    else current_date - o.data_ultima
  end as dias_sem_medir_calculado,
  case
    when o.termino_vigencia is null then 'Sem informação'
    when o.termino_vigencia < current_date then 'Vencida'
    when o.termino_vigencia <= current_date + 90 then 'Vence em até 90 dias'
    else 'Regular'
  end as situacao_vigencia_calculada
from public.obras o;

grant select on public.obras_indicadores to authenticated;

-- ============================================================
-- 5. ÍNDICES DE CONSULTA
-- ============================================================

create index if not exists obras_nr_solicitacao_idx on public.obras(nr_solicitacao);
create index if not exists obras_nr_contrato_idx on public.obras(nr_contrato);
create index if not exists obras_data_ultima_idx on public.obras(data_ultima desc);
create index if not exists obras_idp_idx on public.obras(idp);
create index if not exists obras_termino_vigencia_idx on public.obras(termino_vigencia);

commit;
