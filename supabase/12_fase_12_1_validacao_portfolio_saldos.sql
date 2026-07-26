-- Validação Fase 12.1
select 'portfolio_obras' as base,count(*) as registros from public.portfolio_obras
union all select 'principais_obras',count(*) from public.principais_obras
union all select 'saldos_alongados_consolidado',count(*) from public.saldos_alongados_consolidado
union all select 'saldos_alongados_detalhado',count(*) from public.saldos_alongados_oficial;

select nr_solicitacao,nr_contrato,percentual_medido,percentual_estimado,idp,
       case when percentual_estimado<>0 then percentual_medido/percentual_estimado end as idp_esperado
from public.portfolio_obras
where idp is distinct from case when percentual_estimado<>0 then percentual_medido/percentual_estimado end
limit 100;

select om,total,
       saldo_2016+saldo_2017+saldo_2018+saldo_2019+saldo_2020+saldo_2021+
       saldo_2022+saldo_2023+saldo_2024+saldo_2025+saldo_2026 as total_calculado
from public.saldos_alongados_consolidado
where abs(total-(saldo_2016+saldo_2017+saldo_2018+saldo_2019+saldo_2020+saldo_2021+
                 saldo_2022+saldo_2023+saldo_2024+saldo_2025+saldo_2026))>0.01;

select categoria,count(*) from public.principais_obras group by categoria order by categoria;
