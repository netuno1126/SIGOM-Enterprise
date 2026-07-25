-- SIGOM Fase 10 — Pesquisa Global, Timeline e Alertas Inteligentes
-- Idempotente e não destrutivo. Execute após as migrations anteriores.
begin;
create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(), obra_id uuid references public.obras(id) on delete set null,
  chave_origem text unique, titulo text not null, nivel text not null default 'Informação', categoria text not null default 'Geral',
  motivo text, situacao text not null default 'Aberto', responsavel text, prazo_tratamento date,
  criado_por uuid references auth.users(id), atualizado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create table if not exists public.alerta_historico (
  id uuid primary key default gen_random_uuid(), alerta_id uuid not null references public.alertas(id) on delete cascade,
  situacao text not null, responsavel text, providencia text, registrado_por uuid references auth.users(id), registrado_em timestamptz not null default now()
);
create table if not exists public.timeline_eventos (
  id uuid primary key default gen_random_uuid(), obra_id uuid not null references public.obras(id) on delete cascade,
  data_evento timestamptz not null, categoria text not null default 'Manual', titulo text not null, descricao text,
  origem text, origem_id uuid, criado_por uuid references auth.users(id), criado_em timestamptz not null default now()
);
create index if not exists alertas_obra_idx on public.alertas(obra_id);
create index if not exists alertas_situacao_idx on public.alertas(situacao,nivel);
create index if not exists alerta_historico_alerta_idx on public.alerta_historico(alerta_id,registrado_em desc);
create index if not exists timeline_eventos_obra_data_idx on public.timeline_eventos(obra_id,data_evento desc);
alter table public.alertas enable row level security; alter table public.alerta_historico enable row level security; alter table public.timeline_eventos enable row level security;
drop policy if exists fase10_alertas_read on public.alertas; create policy fase10_alertas_read on public.alertas for select to authenticated using (true);
drop policy if exists fase10_alertas_write on public.alertas; create policy fase10_alertas_write on public.alertas for all to authenticated using ((select public.sigom_pode_editar())) with check ((select public.sigom_pode_editar()));
drop policy if exists fase10_alerta_hist_read on public.alerta_historico; create policy fase10_alerta_hist_read on public.alerta_historico for select to authenticated using (true);
drop policy if exists fase10_alerta_hist_insert on public.alerta_historico; create policy fase10_alerta_hist_insert on public.alerta_historico for insert to authenticated with check ((select public.sigom_pode_editar()) and registrado_por=(select auth.uid()));
drop policy if exists fase10_timeline_read on public.timeline_eventos; create policy fase10_timeline_read on public.timeline_eventos for select to authenticated using (true);
drop policy if exists fase10_timeline_write on public.timeline_eventos; create policy fase10_timeline_write on public.timeline_eventos for all to authenticated using ((select public.sigom_pode_editar())) with check ((select public.sigom_pode_editar()));
grant select,insert,update on public.alertas to authenticated; grant select,insert on public.alerta_historico to authenticated; grant select,insert,update on public.timeline_eventos to authenticated;
commit;