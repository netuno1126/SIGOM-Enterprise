-- SIGOM Fase 12.14 — Persistência e chave estável do Portfólio
-- Não apaga registros. Compatibiliza aliases e garante a chave usada pelo importador.
begin;

alter table public.portfolio_obras
  add column if not exists opus text,
  add column if not exists contrato text,
  add column if not exists nr_solicitacao text,
  add column if not exists nr_contrato text;

update public.portfolio_obras
set
  opus = coalesce(nullif(opus,''), nr_solicitacao),
  contrato = coalesce(nullif(contrato,''), nr_contrato),
  nr_solicitacao = coalesce(nullif(nr_solicitacao,''), opus),
  nr_contrato = coalesce(nullif(nr_contrato,''), contrato)
where
  opus is distinct from coalesce(nullif(opus,''), nr_solicitacao)
  or contrato is distinct from coalesce(nullif(contrato,''), nr_contrato)
  or nr_solicitacao is distinct from coalesce(nullif(nr_solicitacao,''), opus)
  or nr_contrato is distinct from coalesce(nullif(nr_contrato,''), contrato);

-- O PostgREST precisa de índice UNIQUE completo para usar on_conflict.
do $$
begin
  if not exists (
    select 1
    from public.portfolio_obras
    where coalesce(opus,'')<>''
    group by opus, contrato
    having count(*)>1
  ) then
    create unique index if not exists portfolio_obras_opus_contrato_uq
      on public.portfolio_obras(opus,contrato);
  else
    raise exception 'Existem chaves OPUS + contrato duplicadas em portfolio_obras. Execute a consulta de diagnóstico incluída no README antes de repetir a migration.';
  end if;
end $$;

alter table public.portfolio_obras enable row level security;
drop policy if exists fase12_14_portfolio_read on public.portfolio_obras;
create policy fase12_14_portfolio_read on public.portfolio_obras
for select to authenticated using (true);

drop policy if exists fase12_14_portfolio_write on public.portfolio_obras;
create policy fase12_14_portfolio_write on public.portfolio_obras
for all to authenticated
using (public.sigom_pode_editar())
with check (public.sigom_pode_editar());

grant select,insert,update on public.portfolio_obras to authenticated;

commit;

-- Diagnóstico opcional de duplicidades:
-- select opus,contrato,count(*) from public.portfolio_obras
-- where coalesce(opus,'')<>'' group by opus,contrato having count(*)>1;
