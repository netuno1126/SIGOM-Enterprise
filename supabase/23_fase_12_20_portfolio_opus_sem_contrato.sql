-- SIGOM Fase 12.20 — Portfólio aceita Nº OPUS sem contrato
-- Idempotente e não destrutivo.
begin;

alter table public.portfolio_obras
  add column if not exists opus text,
  add column if not exists contrato text,
  add column if not exists nr_solicitacao text,
  add column if not exists nr_contrato text;

update public.portfolio_obras
set
  opus = coalesce(nullif(regexp_replace(coalesce(opus,nr_solicitacao,''),'[^0-9]','','g'),''), opus, nr_solicitacao),
  nr_solicitacao = coalesce(nullif(regexp_replace(coalesce(nr_solicitacao,opus,''),'[^0-9]','','g'),''), nr_solicitacao, opus),
  contrato = coalesce(contrato,nr_contrato,''),
  nr_contrato = coalesce(nr_contrato,contrato,'')
where opus is not null or nr_solicitacao is not null;

-- Evita mais de um registro sem contrato para o mesmo OPUS.
create unique index if not exists portfolio_obras_opus_sem_contrato_uq
  on public.portfolio_obras(opus)
  where coalesce(trim(contrato),'')='';

create index if not exists portfolio_obras_opus_busca_idx
  on public.portfolio_obras(opus);

alter table public.portfolio_obras enable row level security;
drop policy if exists fase12_20_portfolio_read on public.portfolio_obras;
create policy fase12_20_portfolio_read on public.portfolio_obras
for select to authenticated using (true);
drop policy if exists fase12_20_portfolio_write on public.portfolio_obras;
create policy fase12_20_portfolio_write on public.portfolio_obras
for all to authenticated
using ((select public.sigom_pode_editar()))
with check ((select public.sigom_pode_editar()));

grant select,insert,update on public.portfolio_obras to authenticated;
commit;

-- Diagnóstico: obras do Portfólio sem contrato, mas com OPUS válido.
select opus, contrato, nome_obra, atualizado_em
from public.portfolio_obras
where coalesce(trim(contrato),'')=''
  and coalesce(trim(opus),'')<>''
order by opus;
