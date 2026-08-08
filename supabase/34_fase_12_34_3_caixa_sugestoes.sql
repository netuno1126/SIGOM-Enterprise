-- SIGOM 2026 — Fase 12.34.3
-- Caixa de Sugestões
-- Migration já aplicada no Supabase operacional.
begin;

create table if not exists public.sugestoes_melhoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid(),
  titulo text not null,
  modulo text,
  categoria text not null default 'melhoria',
  sugestao text not null,
  beneficio_esperado text,
  status text not null default 'nova',
  prioridade_admin text,
  observacao_admin text,
  analisado_por uuid,
  analisado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint sugestoes_categoria_chk check (categoria in ('melhoria','correcao','nova_funcionalidade','usabilidade','relatorio','outro')),
  constraint sugestoes_status_chk check (status in ('nova','em_analise','planejada','em_desenvolvimento','implantada','nao_priorizada','arquivada')),
  constraint sugestoes_prioridade_chk check (prioridade_admin is null or prioridade_admin in ('baixa','media','alta','critica'))
);

create index if not exists idx_sugestoes_usuario on public.sugestoes_melhoria(usuario_id);
create index if not exists idx_sugestoes_status on public.sugestoes_melhoria(status);
create index if not exists idx_sugestoes_criado on public.sugestoes_melhoria(criado_em desc);

alter table public.sugestoes_melhoria enable row level security;

drop policy if exists sugestoes_select on public.sugestoes_melhoria;
drop policy if exists sugestoes_insert on public.sugestoes_melhoria;
drop policy if exists sugestoes_update_admin on public.sugestoes_melhoria;

create policy sugestoes_select on public.sugestoes_melhoria
for select to authenticated
using (
  usuario_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id=auth.uid() and lower(p.perfil::text)='administrador' and coalesce(p.ativo,true)=true)
);

create policy sugestoes_insert on public.sugestoes_melhoria
for insert to authenticated with check (usuario_id=auth.uid());

create policy sugestoes_update_admin on public.sugestoes_melhoria
for update to authenticated
using (exists (select 1 from public.profiles p where p.id=auth.uid() and lower(p.perfil::text)='administrador' and coalesce(p.ativo,true)=true))
with check (exists (select 1 from public.profiles p where p.id=auth.uid() and lower(p.perfil::text)='administrador' and coalesce(p.ativo,true)=true));

grant select,insert,update on public.sugestoes_melhoria to authenticated;
revoke all on public.sugestoes_melhoria from anon;

commit;
