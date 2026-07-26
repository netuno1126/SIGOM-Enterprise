# SIGOM Fase 12.2.1 — Correção de execução do Dashboard

Corrige inserção indevida de tags `<script>` dentro de strings JavaScript usadas nas exportações Word/PDF.

## Sintoma
- JavaScript exibido como texto no rodapé;
- gráficos e filtros sem funcionamento;
- zero obras na interface.

## Correção
- scripts do Supabase e adaptador mantidos uma única vez, após o script principal;
- templates de exportação restaurados;
- Dashboard e FIO preservados visualmente.
