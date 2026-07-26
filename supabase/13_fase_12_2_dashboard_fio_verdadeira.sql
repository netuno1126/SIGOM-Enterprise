-- SIGOM Fase 12.2 — Dashboard e FIO verdadeira
-- Complementa a tabela de versões da FIO para preservar exatamente o slide HTML homologado.
begin;
alter table public.fio_edicoes
  add column if not exists html_snapshot text,
  add column if not exists origem_dados jsonb not null default '{}'::jsonb;
create index if not exists fio_edicoes_obra_criado_idx on public.fio_edicoes(obra_id, criado_em desc);
grant select,insert on public.fio_edicoes to authenticated;
commit;
