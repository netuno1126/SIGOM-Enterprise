# SIGOM — Fase 12.1

## Correção das bases oficiais de Portfólio e Saldos Alongados

A Fase 12.1 complementa a Fase 12 e adota como fontes oficiais:

- `Planilha portfólio_Dash.xlsx`, aba `Portfolio`;
- `Principais Obras(2).xlsx`, aba `final`;
- `Saldos_alongados_Dash.xlsx`, aba `Consolidado`.

## Estruturas

### portfolio_obras

Mantém as 51 informações da planilha de Portfólio, o JSON integral da linha e os aliases usados pelas versões anteriores. A chave de atualização é `nr_solicitacao + nr_contrato`.

### principais_obras

Preserva as categorias `OBRAS EM ANDAMENTO` e `FUTURAS OBRAS`, a ordem original, a descrição, a RM e o Nr Solicitação quando existente. Obras futuras sem Nr Solicitação são aceitas.

### saldos_alongados_consolidado

Preserva a estrutura horizontal da planilha: OM, valores de 2016 a 2026 e total.

### saldos_alongados / saldos_alongados_oficial

Mantém a representação anual normalizada para gráficos, filtros e compatibilidade com módulos existentes.

## Regra institucional

`IDP = % medido / % estimado`.
