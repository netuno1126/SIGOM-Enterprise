-- SIGOM 2026 V30.1 — correção do erro 42710
-- Use este arquivo se a tabela importacoes_planilha já foi criada e apareceu:
-- policy "importacoes_read" for table "importacoes_planilha" already exists

alter table public.importacoes_planilha enable row level security;

drop policy if exists importacoes_read on public.importacoes_planilha;
drop policy if exists importacoes_insert on public.importacoes_planilha;
drop policy if exists importacoes_update on public.importacoes_planilha;

create policy importacoes_read on public.importacoes_planilha
for select to authenticated using (true);

create policy importacoes_insert on public.importacoes_planilha
for insert to authenticated
with check (public.pode_editar() and importado_por = auth.uid());

create policy importacoes_update on public.importacoes_planilha
for update to authenticated
using (public.pode_editar())
with check (public.pode_editar());
