-- SIGOM 2026 V30.0
-- Execute no SQL Editor do Supabase usando uma conta proprietária do projeto.

create extension if not exists pgcrypto;

create type public.perfil_sigom as enum ('administrador','auditor','editor','consulta');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  perfil public.perfil_sigom not null default 'consulta',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.obras (
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

create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  grupo_pai_id uuid references public.grupos(id) on delete cascade,
  arquivado boolean not null default false,
  arquivado_em timestamptz,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now(),
  unique(nome, grupo_pai_id)
);

create table public.grupo_obras (
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  obra_id uuid not null references public.obras(id) on delete cascade,
  adicionado_por uuid references auth.users(id),
  adicionado_em timestamptz not null default now(),
  primary key(grupo_id, obra_id)
);

create table public.fio_edicoes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  conteudo jsonb not null default '{}'::jsonb,
  foto_path text,
  versao integer not null default 1,
  editado_por uuid references auth.users(id),
  editado_em timestamptz not null default now()
);

create unique index fio_edicoes_obra_versao_uidx on public.fio_edicoes(obra_id, versao);

create table public.objetivos_auditoria (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  objetivo text,
  opus text,
  contrato text,
  situacao text,
  observacao text,
  auditado boolean not null default false,
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now()
);

create table public.obras_paralisadas (
  id uuid primary key default gen_random_uuid(),
  processo_critico smallint not null check (processo_critico between 1 and 4),
  opus text,
  contrato text,
  titulo text not null,
  dados jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now()
);

create table public.auditoria_logs (
  id bigint generated always as identity primary key,
  usuario_id uuid references auth.users(id),
  acao text not null,
  entidade text not null,
  entidade_id text,
  antes jsonb,
  depois jsonb,
  criado_em timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,nome,perfil)
  values(new.id,coalesce(new.raw_user_meta_data->>'nome',split_part(new.email,'@',1)),'consulta')
  on conflict(id) do nothing;
  return new;
end;$$;

create trigger on_auth_user_created
after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.meu_perfil()
returns public.perfil_sigom language sql stable security definer set search_path=public as $$
  select perfil from public.profiles where id=auth.uid() and ativo=true
$$;

create or replace function public.pode_editar()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(public.meu_perfil() in ('administrador','editor'),false)
$$;

create or replace function public.pode_auditar()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(public.meu_perfil() in ('administrador','editor','auditor'),false)
$$;

alter table public.profiles enable row level security;
alter table public.obras enable row level security;
alter table public.grupos enable row level security;
alter table public.grupo_obras enable row level security;
alter table public.fio_edicoes enable row level security;
alter table public.objetivos_auditoria enable row level security;
alter table public.obras_paralisadas enable row level security;
alter table public.auditoria_logs enable row level security;

create policy profiles_select_self_or_admin on public.profiles for select to authenticated
using (id=auth.uid() or public.meu_perfil()='administrador');
create policy profiles_admin_update on public.profiles for update to authenticated
using (public.meu_perfil()='administrador') with check (public.meu_perfil()='administrador');

create policy obras_read on public.obras for select to authenticated using (true);
create policy obras_write on public.obras for all to authenticated using (public.pode_editar()) with check (public.pode_editar());

create policy grupos_read on public.grupos for select to authenticated using (true);
create policy grupos_write on public.grupos for all to authenticated using (public.pode_editar()) with check (public.pode_editar());
create policy grupo_obras_read on public.grupo_obras for select to authenticated using (true);
create policy grupo_obras_write on public.grupo_obras for all to authenticated using (public.pode_editar()) with check (public.pode_editar());

create policy fio_read on public.fio_edicoes for select to authenticated using (true);
create policy fio_write on public.fio_edicoes for all to authenticated using (public.pode_editar()) with check (public.pode_editar());

create policy objetivos_read on public.objetivos_auditoria for select to authenticated using (true);
create policy objetivos_write on public.objetivos_auditoria for all to authenticated using (public.pode_auditar()) with check (public.pode_auditar());

create policy paralisadas_read on public.obras_paralisadas for select to authenticated using (true);
create policy paralisadas_write on public.obras_paralisadas for all to authenticated using (public.pode_editar()) with check (public.pode_editar());

create policy logs_read_admin_auditor on public.auditoria_logs for select to authenticated
using (public.meu_perfil() in ('administrador','auditor'));
create policy logs_insert_authenticated on public.auditoria_logs for insert to authenticated
with check (usuario_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('fio-fotos','fio-fotos',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create policy fio_storage_read on storage.objects for select to authenticated
using (bucket_id='fio-fotos');
create policy fio_storage_insert on storage.objects for insert to authenticated
with check (bucket_id='fio-fotos' and public.pode_editar());
create policy fio_storage_update on storage.objects for update to authenticated
using (bucket_id='fio-fotos' and public.pode_editar()) with check (bucket_id='fio-fotos' and public.pode_editar());
create policy fio_storage_delete on storage.objects for delete to authenticated
using (bucket_id='fio-fotos' and public.pode_editar());
