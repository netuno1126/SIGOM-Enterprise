# SIGOM Fase 12 — Modelo de Dados e Fórmulas

## Arquivo oficial de referência

`Planilha de Obras_Dash.xlsx`, aba `Portfolio`, com 51 colunas e 557 registros no arquivo analisado.

## Regra oficial

`IDP = % medido / % estimado`

## Supabase

Execute na ordem:

1. `supabase/09_fase_12_modelo_dados_formulas.sql`
2. Importe a planilha pela tela Administração.
3. `supabase/10_fase_12_validacao_dados.sql`

A migration complementa a tabela existente. Não apaga obras, FIO, grupos, objetivos, alertas ou consultas da IA.

## Atenção

A migration pressupõe que `public.obras.id` seja UUID. Confirme antes da execução em produção.

## Complemento Fase 12.1

A estrutura oficial do Portfólio, Principais Obras e Saldos Alongados foi acrescentada pelos arquivos:

- `supabase/11_fase_12_1_portfolio_saldos_principais.sql`
- `supabase/12_fase_12_1_validacao_portfolio_saldos.sql`
- `mapeamentos/portfolio_saldos_principais.json`

A importação online passa a reconhecer diretamente os três formatos oficiais.
