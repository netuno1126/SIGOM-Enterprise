-- SIGOM 2026 V31.1 — Persistência de Portfólio, Saldos Alongados e
-- mapa de Nome da Obra (antes eram apenas upload local por sessão).
-- Execute no SQL Editor do Supabase, depois de 01_schema_rls.sql.

-- ===== Portfólio de Obras Selecionadas (mesma forma da tabela obras) =====
create table public.portfolio_obras (
  id uuid primary key default gen_random_uuid(),
  opus text not null,
  contrato text not null default '',
  rm text,
  contratante text,
  om_beneficiada text,
  descricao text,
  nome_obra text,
  empresa text,
  valor_atual numeric(18,2),
  total_ne numeric(18,2),
  total_nf numeric(18,2),
  percentual_medido numeric(10,4),
  percentual_estimado numeric(10,4),
  dados jsonb not null default '{}'::jsonb,
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now(),
  unique(opus, contrato)
);

-- ===== Saldos Alongados — formato longo (uma linha por OM + Ano) =====
-- A planilha original é uma matriz OM x Ano; aqui fica normalizada para
-- facilitar consulta/RLS. A tela reconstrói a matriz no navegador.
create table public.saldos_alongados (
  id uuid primary key default gen_random_uuid(),
  om text not null,
  ano integer not null,
  valor numeric(18,2) not null default 0,
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now(),
  unique(om, ano)
);

-- ===== Mapa de Nome da Obra (nome curto por Nº OPUS) =====
create table public.nomes_obras (
  id uuid primary key default gen_random_uuid(),
  opus text not null unique,
  nome text not null,
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now()
);

alter table public.portfolio_obras enable row level security;
alter table public.saldos_alongados enable row level security;
alter table public.nomes_obras enable row level security;

-- Mesmas regras já usadas em obras/grupos: qualquer usuário autenticado
-- lê; só quem pode editar (administrador/editor) grava.
create policy portfolio_read on public.portfolio_obras for select to authenticated using (true);
create policy portfolio_write on public.portfolio_obras for all to authenticated
  using (public.pode_editar()) with check (public.pode_editar());

create policy saldos_read on public.saldos_alongados for select to authenticated using (true);
create policy saldos_write on public.saldos_alongados for all to authenticated
  using (public.pode_editar()) with check (public.pode_editar());

create policy nomes_read on public.nomes_obras for select to authenticated using (true);
create policy nomes_write on public.nomes_obras for all to authenticated
  using (public.pode_editar()) with check (public.pode_editar());
