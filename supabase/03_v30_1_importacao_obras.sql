-- SIGOM 2026 V30.1 — importação de obras
-- Execute depois de 01_schema_rls.sql.

alter table public.obras
  add column if not exists criado_em timestamptz not null default now(),
  add column if not exists origem_importacao_id uuid;

create table if not exists public.importacoes_planilha (
  id uuid primary key default gen_random_uuid(),
  nome_arquivo text not null,
  tamanho_bytes bigint,
  linhas_lidas integer not null default 0,
  obras_processadas integer not null default 0,
  obras_com_erro integer not null default 0,
  status text not null default 'processando' check(status in ('processando','concluida','concluida_com_erros','falhou')),
  detalhes jsonb not null default '{}'::jsonb,
  importado_por uuid references auth.users(id),
  importado_em timestamptz not null default now(),
  concluido_em timestamptz
);

alter table public.obras
  drop constraint if exists obras_origem_importacao_id_fkey;
alter table public.obras
  add constraint obras_origem_importacao_id_fkey
  foreign key(origem_importacao_id) references public.importacoes_planilha(id) on delete set null;

alter table public.importacoes_planilha enable row level security;

-- Permite executar este arquivo novamente sem erro de política já existente.
drop policy if exists importacoes_read on public.importacoes_planilha;
drop policy if exists importacoes_insert on public.importacoes_planilha;
drop policy if exists importacoes_update on public.importacoes_planilha;

create policy importacoes_read on public.importacoes_planilha
for select to authenticated using (true);

create policy importacoes_insert on public.importacoes_planilha
for insert to authenticated with check (public.pode_editar() and importado_por=auth.uid());

create policy importacoes_update on public.importacoes_planilha
for update to authenticated using (public.pode_editar()) with check (public.pode_editar());

create index if not exists obras_rm_idx on public.obras(rm);
create index if not exists obras_empresa_idx on public.obras(empresa);
create index if not exists obras_contratante_idx on public.obras(contratante);
create index if not exists obras_atualizado_em_idx on public.obras(atualizado_em desc);
create index if not exists importacoes_importado_em_idx on public.importacoes_planilha(importado_em desc);

create or replace function public.registrar_importacao_auditoria()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.auditoria_logs(usuario_id,acao,entidade,entidade_id,depois)
  values(new.importado_por,'IMPORTAR_PLANILHA','importacoes_planilha',new.id::text,to_jsonb(new));
  return new;
end;$$;

drop trigger if exists trg_importacao_auditoria on public.importacoes_planilha;
create trigger trg_importacao_auditoria
after insert on public.importacoes_planilha
for each row execute procedure public.registrar_importacao_auditoria();
