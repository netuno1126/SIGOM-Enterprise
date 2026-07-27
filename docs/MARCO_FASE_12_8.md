# SIGOM — Fase 12.8

## Correção da alternância Planilha de Obras × Portfólio

O checkbox **Somente portfólio selecionado (Planilha do Portfólio)** passa a trocar efetivamente a base ativa da Visão Geral.

### Regras

- Desmarcado: usa `DATA`, alimentada por `obras_indicadores`/`obras`.
- Marcado: usa `PORT`, alimentada por `portfolio_obras`.
- O grupo técnico `__PORT__` não é mais ativado silenciosamente.
- Ao alternar, os filtros de RM, Contratante, Empresa e Contrato são reconstruídos com a fonte ativa.
- KPIs, resumo de contratos, tabela, gráficos e exportações usam a mesma fonte selecionada.
- Se `portfolio_obras` estiver vazia, a marcação é cancelada e o usuário recebe um aviso.

Nenhuma migration SQL é necessária.
