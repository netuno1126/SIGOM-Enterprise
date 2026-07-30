-- ============================================================
-- SIGOM 2026 — Fase 12.32
-- Correção do versionamento da FIO
--
-- Remove a restrição incorreta UNIQUE (obra_id), que impedia
-- salvar mais de uma versão por obra.
--
-- Mantém a unicidade correta por obra + versão.
-- Script idempotente e não destrutivo.
-- ============================================================

begin;

alter table public.fio_edicoes
  drop constraint if exists fio_edicoes_obra_id_unique;

create unique index if not exists fio_edicoes_obra_versao_uidx
  on public.fio_edicoes (obra_id, versao);

commit;
