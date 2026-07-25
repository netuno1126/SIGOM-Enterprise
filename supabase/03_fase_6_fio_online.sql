-- SIGOM Fase 6 — FIO online, fotos e histórico de versões
-- Idempotente. Não remove versões ou arquivos existentes.
begin;
create table if not exists public.fio_edicoes (
  id uuid primary key default gen_random_uuid(), obra_id uuid not null references public.obras(id) on delete cascade,
  versao integer not null, situacao text, data_referencia date, responsavel text, percentual_fisico numeric(7,2),
  resumo_executivo text, servicos_executados text, servicos_andamento text, proximos_passos text,
  problemas text, providencias text, observacoes text, criado_por uuid references auth.users(id), criado_em timestamptz not null default now(),
  unique(obra_id,versao)
);
create table if not exists public.fio_fotos (
  id uuid primary key default gen_random_uuid(), fio_edicao_id uuid not null references public.fio_edicoes(id) on delete cascade,
  obra_id uuid not null references public.obras(id) on delete cascade, caminho text not null unique, nome_arquivo text,
  tamanho_bytes bigint, mime_type text, legenda text, ordem integer default 0, criado_por uuid references auth.users(id), criado_em timestamptz not null default now()
);
create index if not exists fio_edicoes_obra_versao_idx on public.fio_edicoes(obra_id,versao desc);
create index if not exists fio_fotos_edicao_idx on public.fio_fotos(fio_edicao_id,ordem);
alter table public.fio_edicoes enable row level security;alter table public.fio_fotos enable row level security;
drop policy if exists fase6_fio_read on public.fio_edicoes;create policy fase6_fio_read on public.fio_edicoes for select to authenticated using (true);
drop policy if exists fase6_fio_insert on public.fio_edicoes;create policy fase6_fio_insert on public.fio_edicoes for insert to authenticated with check ((select public.sigom_pode_editar()) and criado_por=(select auth.uid()));
drop policy if exists fase6_fotos_read on public.fio_fotos;create policy fase6_fotos_read on public.fio_fotos for select to authenticated using (true);
drop policy if exists fase6_fotos_insert on public.fio_fotos;create policy fase6_fotos_insert on public.fio_fotos for insert to authenticated with check ((select public.sigom_pode_editar()) and criado_por=(select auth.uid()));
grant select,insert on public.fio_edicoes to authenticated;grant select,insert on public.fio_fotos to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('fio-fotos','fio-fotos',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists fase6_storage_fio_read on storage.objects;create policy fase6_storage_fio_read on storage.objects for select to authenticated using(bucket_id='fio-fotos');
drop policy if exists fase6_storage_fio_insert on storage.objects;create policy fase6_storage_fio_insert on storage.objects for insert to authenticated with check(bucket_id='fio-fotos' and (select public.sigom_pode_editar()));
commit;
