-- SIGOM Fase 12.33 Institucional — Revisão 2
-- Corrige Objetivos 2 e 3 e preserva a medição RPNP já lançada.

begin;

update public.objetivos
set titulo='Reduzir a perda de Restos a Pagar Não Processados (RPNP)',
    descricao='Acompanhar e reduzir o percentual de RPNP cancelados em relação ao total de RPNP inscritos.',
    atualizado_em=now()
where codigo='OBJ2' and exercicio=2026;

update public.objetivos
set titulo='Aumentar as liquidações dos créditos recebidos',
    descricao='Liquidar, no mínimo, 75% dos créditos recebidos no ano de 2026.',
    atualizado_em=now()
where codigo='OBJ3' and exercicio=2026;

update public.objetivos_indicadores_medicoes
set codigo_objetivo='OBJ2',
    objetivo_id=(select id from public.objetivos where codigo='OBJ2' and exercicio=2026 limit 1),
    nome_indicador='Percentual de RPNP cancelados',
    atualizado_em=now()
where codigo_objetivo='OBJ3'
  and nome_indicador='Percentual de RPNP cancelados';

alter table public.objetivos_indicadores_medicoes
  add column if not exists credito_recebido numeric,
  add column if not exists valor_liquidado numeric;

alter table public.objetivos_indicadores_medicoes
  drop column if exists percentual_liquidado;

alter table public.objetivos_indicadores_medicoes
  add column percentual_liquidado numeric generated always as (
    case when coalesce(credito_recebido,0) > 0
      then round((coalesce(valor_liquidado,0) / credito_recebido) * 100, 4)
      else null end
  ) stored;

commit;
