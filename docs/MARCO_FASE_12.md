# SIGOM — Fase 12
## Modelo de Dados Definitivo e Motor de Fórmulas

A Fase 12 torna a `Planilha de Obras_Dash.xlsx`, aba `Portfolio`, a referência oficial para a estrutura operacional da tabela de obras.

## Decisão institucional do IDP

```text
IDP = % medido / % estimado
```

Interpretação:

- menor que 0,70: crítica;
- 0,70 a menor que 0,85: atenção;
- 0,85 a 1,00: adequada;
- acima de 1,00: adiantada.

## Entregas

- 51 campos da planilha mapeados para colunas normalizadas;
- preservação integral da linha importada em `dados_origem`;
- compatibilidade com `opus`, `contrato`, `descricao`, `total_nf` e `dados`;
- trigger oficial de recálculo;
- histórico de medições;
- view `obras_indicadores`;
- relatório SQL de validação e divergências;
- importador web atualizado para a chave `Nr Solicitação + Nr Contrato`.

## Política de dados

Campos de origem são preservados. Campos calculados são recalculados no banco. Valores históricos permanecem em `dados_origem` e no histórico de importações.

## Ordem de implantação

1. Backup do banco.
2. Executar `09_fase_12_modelo_dados_formulas.sql`.
3. Publicar a Fase 12 em preview.
4. Importar a planilha oficial pela Administração.
5. Executar `10_fase_12_validacao_dados.sql`.
6. Homologar resultados antes da produção.
