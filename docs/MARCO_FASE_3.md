# SIGOM — Marco Fase 3

## Escopo

A Fase 3 acrescenta ao dashboard conectado ao Supabase:

- Visão completa da obra;
- primeira linha financeira;
- segunda linha de prazos;
- indicadores físicos e de situação;
- curva histórica de medição;
- gráficos financeiros e físicos individuais;
- informações complementares preservadas no JSON `dados`;
- análises avançadas por filtros e grupos;
- top 15 dias sem medir;
- distribuição do IDP;
- maiores obras e empresas por valor;
- gráfico medido x estimado;
- análise de vigências;
- tabela de obras críticas;
- ajuste do tamanho das fontes dos gráficos.

## Regra do IDP

`IDP = % estimado / % medido`

Faixas usadas nas análises:

- menor que 0,70: crítico;
- 0,70 até menor que 0,85: atenção;
- 0,85 até 1,00: adequado;
- acima de 1,00: adiantado.

## Regra de criticidade

Uma obra é apresentada como crítica quando:

- IDP menor que 0,70; ou
- há mais de 90 dias desde a última medição identificada.

## Segurança

Esta etapa continua somente leitura. Nenhuma obra, grupo, usuário ou FIO é alterado pelo dashboard.
