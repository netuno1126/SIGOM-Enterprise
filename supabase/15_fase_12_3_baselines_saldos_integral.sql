-- SIGOM Fase 12.3 — Baselines originais e preservação integral dos Saldos Alongados
begin;
alter table public.saldos_alongados_consolidado
  add column if not exists total_informado numeric,
  add column if not exists total_calculado numeric,
  add column if not exists linha_tipo text not null default 'OM',
  add column if not exists ordem integer not null default 1;
alter table public.saldos_alongados_consolidado alter column total drop not null;
create or replace function public.sigom_saldos_consolidado_calcular() returns trigger language plpgsql set search_path=public as $$
begin
  new.total_calculado := coalesce(new.saldo_2016,0)+coalesce(new.saldo_2017,0)+coalesce(new.saldo_2018,0)+coalesce(new.saldo_2019,0)+coalesce(new.saldo_2020,0)+coalesce(new.saldo_2021,0)+coalesce(new.saldo_2022,0)+coalesce(new.saldo_2023,0)+coalesce(new.saldo_2024,0)+coalesce(new.saldo_2025,0)+coalesce(new.saldo_2026,0);
  if new.total_informado is null and new.total is not null then new.total_informado:=new.total; end if;
  new.total:=new.total_informado;
  new.linha_tipo:=case when upper(trim(new.om))='TOTAL' then 'TOTAL' when upper(trim(new.om))='EB' then 'EB' when upper(trim(new.om))='TEREO' then 'TEREO' else coalesce(nullif(new.linha_tipo,''),'OM') end;
  new.atualizado_em:=now();return new;
end;$$;
drop trigger if exists trg_sigom_saldos_consolidado_calcular on public.saldos_alongados_consolidado;
create trigger trg_sigom_saldos_consolidado_calcular before insert or update on public.saldos_alongados_consolidado for each row execute function public.sigom_saldos_consolidado_calcular();
create index if not exists saldos_alongados_ordem_idx on public.saldos_alongados_consolidado(ordem);
grant select,insert,update on public.saldos_alongados_consolidado to authenticated;
commit;
