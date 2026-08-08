-- SIGOM 2026 — Fase 12.34.2
-- Alertas de medição + lista oficial do Objetivo 5
-- Idempotente e não destrutivo.

begin;

create table if not exists public.alertas_medicao(
 id uuid primary key default gen_random_uuid(),
 obra_id uuid null references public.obras(id) on delete set null,
 opus text,
 contrato text,
 percentual_anterior numeric,
 percentual_novo numeric,
 variacao numeric,
 lido boolean not null default false,
 lido_em timestamptz,
 criado_em timestamptz not null default now()
);

create index if not exists idx_alertas_medicao_data on public.alertas_medicao(criado_em desc);
create index if not exists idx_alertas_medicao_opus on public.alertas_medicao(opus);
create index if not exists idx_alertas_medicao_lido on public.alertas_medicao(lido);

alter table public.alertas_medicao enable row level security;
drop policy if exists alertas_medicao_select on public.alertas_medicao;
drop policy if exists alertas_medicao_update on public.alertas_medicao;
create policy alertas_medicao_select on public.alertas_medicao for select to authenticated using (true);
create policy alertas_medicao_update on public.alertas_medicao for update to authenticated using (true) with check (true);

create or replace function public.sigom_alertar_avanco_medicao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
 oldp numeric := coalesce(old.percentual_medido,0);
 newp numeric := coalesce(new.percentual_medido,0);
begin
 if newp > oldp then
   insert into public.alertas_medicao(obra_id,opus,contrato,percentual_anterior,percentual_novo,variacao)
   values(new.id,new.opus,new.contrato,oldp,newp,newp-oldp);
 end if;
 return new;
end $$;
revoke all on function public.sigom_alertar_avanco_medicao() from public, anon, authenticated;

drop trigger if exists trg_sigom_alertar_avanco_medicao on public.obras;
create trigger trg_sigom_alertar_avanco_medicao
after update of percentual_medido on public.obras
for each row execute function public.sigom_alertar_avanco_medicao();

create table if not exists public.objetivo5_lista_referencia(
 opus text primary key,
 nome_obra text,
 situacao text,
 responsavel text,
 prazo date,
 observacoes text,
 atualizado_em timestamptz not null default now()
);
alter table public.objetivo5_lista_referencia enable row level security;
drop policy if exists obj5_lista_select on public.objetivo5_lista_referencia;
drop policy if exists obj5_lista_write on public.objetivo5_lista_referencia;
create policy obj5_lista_select on public.objetivo5_lista_referencia for select to authenticated using(true);
create policy obj5_lista_write on public.objetivo5_lista_referencia for all to authenticated
using ((select public.sigom_pode_editar())) with check ((select public.sigom_pode_editar()));

insert into public.objetivo5_lista_referencia(opus,nome_obra)
values
('201601000199','PALL da EsACosAAe'),
('201701000170','Infraestrutura da EsACosAAe'),
('201801000222','Auditório do 1º GAAAe'),
('201401000452','Infraestrutura do CIOPESP'),
('201801000217','Casa Anti-Terror do CIOPESP'),
('202008000065','2 Blocos PNR de Macapá'),
('201609000332','Fotovoltaica do PEF de Guaporé'),
('202109000127','Fotovoltaica do PEF de Porto Índio'),
('202109000275','Garagens do 17º B Fron'),
('201909000030','Garagem de Embarcações do 66º BIMtz'),
('202509000072','Garagem e Pátio de Formatura da CRO/9'),
('202509000214','Pavilhão Seção Técnica da CRO/9')
on conflict(opus) do update set nome_obra=excluded.nome_obra, atualizado_em=now();

commit;
