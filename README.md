# SIGOM — Fase 12.34.4 — Integração de Menu

Corrige o problema em que os módulos já existiam, mas não apareciam na navegação.

Dashboard:
- 🔔 Atualizações de Medição
- 💡 Caixa de Sugestões
- contador de não lidos

Objetivos e Metas:
- Visão do Diretor
- 🔔 Medições
- links também no menu

Causa identificada:
`public/app/fase-12-34-2-integracao.js` existe no repositório, porém não estava sendo carregado por `dashboard.html` nem por `objetivos.html`.

Commit recomendado:
fix: exibir alertas, sugestões e Visão do Diretor na navegação do SIGOM
