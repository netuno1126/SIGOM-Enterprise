-- SIGOM Fase 7 — Objetivos e Metas online
-- Idempotente, não destrutivo e compatível com as Fases 1–6.
begin;
create extension if not exists pgcrypto;

create table if not exists public.objetivos (
 id uuid primary key default gen_random_uuid(),
 codigo text not null,
 exercicio integer not null,
 titulo text not null,
 descricao text,
 situacao text not null default 'Planejado' check (situacao in ('Planejado','Em andamento','Concluído','Suspenso','Cancelado')),
 prioridade text not null default 'Alta' check (prioridade in ('Estratégica','Alta','Média','Baixa')),
 responsavel text,
 prazo_final date,
 arquivado boolean not null default false,
 criado_por uuid references auth.users(id),
 atualizado_por uuid references auth.users(id),
 atualizado_por_nome text,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now(),
 unique (codigo, exercicio)
);
create table if not exists public.objetivo_metas (
 id uuid primary key default gen_random_uuid(),
 objetivo_id uuid not null references public.objetivos(id) on delete cascade,
 titulo text not null,
 indicador text,
 valor_meta numeric,
 valor_realizado numeric,
 unidade text,
 progresso numeric not null default 0 check (progresso between 0 and 100),
 peso numeric not null default 1 check (peso > 0),
 prazo date,
 ordem integer not null default 1,
 criado_em timestamptz not null default now()
);
create table if not exists public.objetivo_obras (
 objetivo_id uuid not null references public.objetivos(id) on delete cascade,
 obra_id uuid not null references public.obras(id) on delete cascade,
 observacao text,
 criado_em timestamptz not null default now(),
 primary key (objetivo_id,obra_id)
);
create table if not exists public.objetivo_versoes (
 id uuid primary key default gen_random_uuid(),
 objetivo_id uuid not null references public.objetivos(id) on delete cascade,
 versao integer not null,
 snapshot jsonb not null,
 criado_por uuid references auth.users(id),
 criado_por_nome text,
 criado_em timestamptz not null default now(),
 unique (objetivo_id,versao)
);
create index if not exists objetivos_exercicio_situacao_idx on public.objetivos(exercicio,situacao);
create index if not exists objetivo_metas_objetivo_idx on public.objetivo_metas(objetivo_id,ordem);
create index if not exists objetivo_obras_obra_idx on public.objetivo_obras(obra_id);
create index if not exists objetivo_versoes_objetivo_idx on public.objetivo_versoes(objetivo_id,versao desc);

alter table public.objetivos enable row level security;
alter table public.objetivo_metas enable row level security;
alter table public.objetivo_obras enable row level security;
alter table public.objetivo_versoes enable row level security;

-- Leitura para usuários autenticados e ativos; escrita somente Administrador/Editor.
drop policy if exists fase7_objetivos_read on public.objetivos;
create policy fase7_objetivos_read on public.objetivos for select to authenticated using (true);
drop policy if exists fase7_objetivos_write on public.objetivos;
create policy fase7_objetivos_write on public.objetivos for all to authenticated using ((select public.sigom_pode_editar())) with check ((select public.sigom_pode_editar()));

drop policy if exists fase7_metas_read on public.objetivo_metas;
create policy fase7_metas_read on public.objetivo_metas for select to authenticated using (true);
drop policy if exists fase7_metas_write on public.objetivo_metas;
create policy fase7_metas_write on public.objetivo_metas for all to authenticated using ((select public.sigom_pode_editar())) with check ((select public.sigom_pode_editar()));

drop policy if exists fase7_objetivo_obras_read on public.objetivo_obras;
create policy fase7_objetivo_obras_read on public.objetivo_obras for select to authenticated using (true);
drop policy if exists fase7_objetivo_obras_write on public.objetivo_obras;
create policy fase7_objetivo_obras_write on public.objetivo_obras for all to authenticated using ((select public.sigom_pode_editar())) with check ((select public.sigom_pode_editar()));

drop policy if exists fase7_versoes_read on public.objetivo_versoes;
create policy fase7_versoes_read on public.objetivo_versoes for select to authenticated using (true);
drop policy if exists fase7_versoes_insert on public.objetivo_versoes;
create policy fase7_versoes_insert on public.objetivo_versoes for insert to authenticated with check ((select public.sigom_pode_editar()) and criado_por=(select auth.uid()));

revoke all on public.objetivos, public.objetivo_metas, public.objetivo_obras, public.objetivo_versoes from anon;
grant select,insert,update on public.objetivos to authenticated;
grant select,insert,update,delete on public.objetivo_metas to authenticated;
grant select,insert,update,delete on public.objetivo_obras to authenticated;
grant select,insert on public.objetivo_versoes to authenticated;
commit;
