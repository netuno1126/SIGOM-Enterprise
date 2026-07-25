# SIGOM — Fase 2: Dashboard conectado ao Supabase

## Escopo entregue

- Consulta autenticada da tabela `public.obras`.
- Consulta dos grupos e vínculos `grupos` + `grupo_obras`.
- Carregamento paginado para suportar crescimento acima de 1.000 registros.
- Filtros por pesquisa, RM, contratante, empresa, grupo e faixa de medição.
- KPIs físico-financeiros.
- Gráficos gerenciais.
- Tabela paginada, ordenável e com detalhe completo.
- Exportação CSV respeitando os filtros.
- Impressão/PDF pelo navegador.
- Baseline original preservada em `public/app/legacy/dashboard_original.html`.

## Regras preservadas

- Moeda `pt-BR`, com valores completos e centavos.
- IDP exibido como `% estimado / % medido`.
- Nenhum dado é alterado por esta versão do dashboard.
- A autenticação e o MFA AAL2 da Fase 1 permanecem obrigatórios.

## Limites deste marco

As telas avançadas do HTML legado continuam preservadas, mas ainda não foram todas reimplementadas com dados online. A Fase 2 entrega o núcleo online de consulta gerencial para homologação.
