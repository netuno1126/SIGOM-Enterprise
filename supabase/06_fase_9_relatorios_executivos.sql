-- SIGOM Fase 9 — Relatórios Executivos e Painel do Diretor
-- Idempotente e não destrutivo. Não altera dados operacionais.
begin;
create extension if not exists pgcrypto;
create table if not exists public.relatorios_executivos (
 id uuid primary key default gen_random_uuid(),
 titulo text not null,
 destinatario text,
 observacoes text,
 snapshot jsonb not null,
 criado_por uuid references auth.users(id),
 criado_por_nome text,
 criado_em timestamptz not null default now()
);
create index if not exists relatorios_executivos_criado_idx on public.relatorios_executivos(criado_em desc);
alter table public.relatorios_executivos enable row level security;
drop policy if exists fase9_relatorios_read on public.relatorios_executivos;
create policy fase9_relatorios_read on public.relatorios_executivos for select to authenticated using (true);
drop policy if exists fase9_relatorios_insert on public.relatorios_executivos;
create policy fase9_relatorios_insert on public.relatorios_executivos for insert to authenticated with check ((select public.sigom_pode_editar()) and criado_por=(select auth.uid()));
revoke all on public.relatorios_executivos from anon;
grant select,insert on public.relatorios_executivos to authenticated;
commit;
