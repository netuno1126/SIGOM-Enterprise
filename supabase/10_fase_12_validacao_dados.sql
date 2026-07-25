-- SIGOM Fase 12 — Validação pós-migração
-- Execute depois de 09_fase_12_modelo_dados_formulas.sql.

-- 1. Quantidade total de obras.
select count(*) as quantidade_obras from public.obras;

-- 2. Cobertura das informações principais.
select
  count(*) as total,
  count(*) filter (where nr_solicitacao is not null) as com_nr_solicitacao,
  count(*) filter (where nr_contrato is not null) as com_nr_contrato,
  count(*) filter (where valor_atual is not null) as com_valor_atual,
  count(*) filter (where percentual_medido is not null) as com_percentual_medido,
  count(*) filter (where percentual_estimado is not null) as com_percentual_estimado,
  count(*) filter (where idp is not null) as com_idp,
  count(*) filter (where dados_origem is not null) as com_dados_origem
from public.obras;

-- 3. Conferência da fórmula oficial IDP = medido / estimado.
select
  id,
  opus,
  contrato,
  percentual_medido,
  percentual_estimado,
  idp,
  case
    when coalesce(percentual_estimado, 0) = 0 then null
    else percentual_medido / percentual_estimado
  end as idp_recalculado,
  abs(
    coalesce(idp, 0) -
    coalesce(percentual_medido / nullif(percentual_estimado, 0), 0)
  ) as divergencia
from public.obras
where percentual_medido is not null
  and percentual_estimado is not null
order by divergencia desc
limit 100;

-- 4. Duplicidades da chave operacional.
select opus, contrato, count(*) as quantidade
from public.obras
group by opus, contrato
having count(*) > 1
order by quantidade desc;

-- 5. Valores financeiros inconsistentes para conferência manual.
select opus, contrato, valor_atual, total_ne, total_notas_fiscais,
       percentual_empenhado, falta_empenhar, saldo_empenho
from public.obras
where total_ne > valor_atual
   or total_notas_fiscais > total_ne
order by valor_atual desc;

-- 6. Histórico de medições criado.
select tipo_referencia, count(*) as quantidade
from public.obras_medicoes
group by tipo_referencia
order by tipo_referencia;
