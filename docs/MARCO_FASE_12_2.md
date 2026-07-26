# SIGOM Fase 12.2 — Interface GOLD e FIO verdadeira

- Dashboard principal substituído pela interface homologada `dashboard_SIGOM(1).html`.
- Mantidos os mesmos botões, abas, menus, filtros, gráficos e controles de minimizar/expandir.
- Filtros ativos passam a usar realce amarelo/laranja e termos encontrados permanecem destacados.
- Dashboard lê `obras_indicadores`, `portfolio_obras`, `principais_obras` e `saldos_alongados_consolidado` no Supabase.
- FIO substituída integralmente pela interface homologada `fio_slide_SIGOM(5).html`.
- FIO extrai dados físicos, financeiros, medições, projeções e fórmulas do Supabase.
- Regra oficial: IDP = percentual medido / percentual estimado.
- Edições da FIO geram versões em `fio_edicoes`, preservando o HTML exato em `html_snapshot`.
