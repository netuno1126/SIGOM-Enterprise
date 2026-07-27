# SIGOM — Fase 12.16

## Estado inicial do Dashboard

Após cada login ou recarregamento autenticado, o Dashboard abre na **Visão Geral** com:

- Somente portfólio selecionado: marcado, quando houver registros em `portfolio_obras`;
- Grupo: todos;
- RM: todas;
- Contratante: todos;
- Empresa: todas;
- Contrato: todos;
- Prazo: todos;
- Pesquisa: vazia;
- filtros individuais da tabela: vazios.

Caso `portfolio_obras` esteja vazio ou indisponível pelo RLS, o sistema mantém a Planilha de Obras como contingência.

Não requer nova migration SQL.
