-- SIGOM Fase 12.2.2 — leitura do Dashboard e tabelas oficiais
-- Idempotente e não destrutivo.
begin;

alter table public.obras enable row level security;
alter table public.portfolio_obras enable row level security;
alter table public.principais_obras enable row level security;
alter table public.saldos_alongados_consolidado enable row level security;

drop policy if exists fase12_2_2_obras_read on public.obras;
create policy fase12_2_2_obras_read on public.obras
for select to authenticated using (true);

drop policy if exists fase12_2_2_portfolio_read on public.portfolio_obras;
create policy fase12_2_2_portfolio_read on public.portfolio_obras
for select to authenticated using (true);

drop policy if exists fase12_2_2_principais_read on public.principais_obras;
create policy fase12_2_2_principais_read on public.principais_obras
for select to authenticated using (true);

drop policy if exists fase12_2_2_saldos_read on public.saldos_alongados_consolidado;
create policy fase12_2_2_saldos_read on public.saldos_alongados_consolidado
for select to authenticated using (true);

grant select on public.obras, public.portfolio_obras, public.principais_obras, public.saldos_alongados_consolidado to authenticated;
grant select on public.obras_indicadores to authenticated;

commit;
