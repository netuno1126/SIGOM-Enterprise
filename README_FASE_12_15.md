# SIGOM — Fase 12.15

Correção da Média Mensal Global:

1. Valores extensos são exibidos como `R$ 90,00 Mi`, `R$ 11,02 Bi`, `R$ 1,25 Tri` etc.
2. O valor integral continua acessível ao passar o mouse sobre o KPI.
3. O cálculo respeita o contexto operacional:
   - grupo selecionado;
   - Portfólio selecionado;
   - base geral quando nenhum dos dois estiver selecionado.
4. Os gráficos e a tabela da aba utilizam o mesmo conjunto de obras do KPI.

Não requer novo SQL.
