-- SIGOM Fase 11 — IA e Briefings Inteligentes
create table if not exists public.ia_consultas (
 id uuid primary key default gen_random_uuid(),
 pergunta text not null,
 resposta text not null,
 escopo text not null default 'geral',
 contexto_resumo jsonb not null default '{}'::jsonb,
 avaliacao smallint check (avaliacao between 1 and 5),
 observacao_avaliacao text,
 criado_por uuid not null default auth.uid() references auth.users(id),
 criado_em timestamptz not null default now()
);
create index if not exists ia_consultas_criado_em_idx on public.ia_consultas(criado_em desc);
create index if not exists ia_consultas_criado_por_idx on public.ia_consultas(criado_por,criado_em desc);
alter table public.ia_consultas enable row level security;
drop policy if exists ia_consultas_select on public.ia_consultas;
create policy ia_consultas_select on public.ia_consultas for select to authenticated using ((select auth.uid())=criado_por or public.sigom_eh_administrador());
drop policy if exists ia_consultas_insert on public.ia_consultas;
create policy ia_consultas_insert on public.ia_consultas for insert to authenticated with check ((select auth.uid())=criado_por);
drop policy if exists ia_consultas_update on public.ia_consultas;
create policy ia_consultas_update on public.ia_consultas for update to authenticated using ((select auth.uid())=criado_por) with check ((select auth.uid())=criado_por);
revoke all on public.ia_consultas from anon;
grant select,insert,update on public.ia_consultas to authenticated;
comment on table public.ia_consultas is 'Histórico assistivo da IA SIGOM; não representa alteração de dados oficiais.';
