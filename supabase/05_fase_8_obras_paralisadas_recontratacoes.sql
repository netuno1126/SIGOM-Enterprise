-- SIGOM Fase 8 — Obras Paralisadas e Recontratações online
-- Idempotente e não destrutivo. Compatível com as Fases 1–7.
begin;
create extension if not exists pgcrypto;
create table if not exists public.obras_paralisadas (
 id uuid primary key default gen_random_uuid(), obra_id uuid not null references public.obras(id) on delete restrict,
 situacao text not null default 'Paralisada' check (situacao in ('Paralisada','Em tratativa','Em recontratação','Retomada','Concluída','Cancelada')),
 prioridade text not null default 'Alta' check (prioridade in ('Crítica','Alta','Média','Baixa')),
 data_paralisacao date, previsao_retomada date, data_retomada date, responsavel text,
 etapa_recontratacao text not null default 'Não iniciada' check (etapa_recontratacao in ('Não iniciada','Levantamento técnico','Projeto/Orçamento','Termo de referência','Licitação','Contratação','Ordem de serviço','Retomada')),
 processo_numero text, percentual_recontratacao numeric not null default 0 check (percentual_recontratacao between 0 and 100),
 valor_estimado_recontratacao numeric not null default 0, causa text, impacto text, providencias text, proximos_passos text, observacoes text,
 arquivado boolean not null default false, criado_por uuid references auth.users(id), atualizado_por uuid references auth.users(id), atualizado_por_nome text,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create unique index if not exists obras_paralisadas_obra_ativa_uidx on public.obras_paralisadas(obra_id) where arquivado=false;
create index if not exists obras_paralisadas_situacao_idx on public.obras_paralisadas(situacao,prioridade);
create index if not exists obras_paralisadas_etapa_idx on public.obras_paralisadas(etapa_recontratacao);
create table if not exists public.obra_paralisada_acoes (
 id uuid primary key default gen_random_uuid(), obra_paralisada_id uuid not null references public.obras_paralisadas(id) on delete cascade,
 descricao text not null, responsavel text, prazo date, situacao text not null default 'Pendente' check (situacao in ('Pendente','Em andamento','Concluída','Cancelada')),
 ordem integer not null default 1, criado_em timestamptz not null default now()
);
create index if not exists obra_paralisada_acoes_registro_idx on public.obra_paralisada_acoes(obra_paralisada_id,ordem);
create table if not exists public.obra_paralisada_versoes (
 id uuid primary key default gen_random_uuid(), obra_paralisada_id uuid not null references public.obras_paralisadas(id) on delete cascade,
 versao integer not null, snapshot jsonb not null, criado_por uuid references auth.users(id), criado_por_nome text, criado_em timestamptz not null default now(),
 unique(obra_paralisada_id,versao)
);
create index if not exists obra_paralisada_versoes_idx on public.obra_paralisada_versoes(obra_paralisada_id,versao desc);
alter table public.obras_paralisadas enable row level security;alter table public.obra_paralisada_acoes enable row level security;alter table public.obra_paralisada_versoes enable row level security;
drop policy if exists fase8_paralisadas_read on public.obras_paralisadas;create policy fase8_paralisadas_read on public.obras_paralisadas for select to authenticated using (true);
drop policy if exists fase8_paralisadas_write on public.obras_paralisadas;create policy fase8_paralisadas_write on public.obras_paralisadas for all to authenticated using ((select public.sigom_pode_editar())) with check ((select public.sigom_pode_editar()));
drop policy if exists fase8_acoes_read on public.obra_paralisada_acoes;create policy fase8_acoes_read on public.obra_paralisada_acoes for select to authenticated using (true);
drop policy if exists fase8_acoes_write on public.obra_paralisada_acoes;create policy fase8_acoes_write on public.obra_paralisada_acoes for all to authenticated using ((select public.sigom_pode_editar())) with check ((select public.sigom_pode_editar()));
drop policy if exists fase8_versoes_read on public.obra_paralisada_versoes;create policy fase8_versoes_read on public.obra_paralisada_versoes for select to authenticated using (true);
drop policy if exists fase8_versoes_insert on public.obra_paralisada_versoes;create policy fase8_versoes_insert on public.obra_paralisada_versoes for insert to authenticated with check ((select public.sigom_pode_editar()) and criado_por=(select auth.uid()));
revoke all on public.obras_paralisadas,public.obra_paralisada_acoes,public.obra_paralisada_versoes from anon;
grant select,insert,update on public.obras_paralisadas to authenticated;grant select,insert,update,delete on public.obra_paralisada_acoes to authenticated;grant select,insert on public.obra_paralisada_versoes to authenticated;
commit;