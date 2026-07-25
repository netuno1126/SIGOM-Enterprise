# SIGOM — Marco da Fase 7

## Objetivos e Metas online

A Fase 7 substitui o armazenamento local do painel de Objetivos por registros compartilhados no Supabase, sem retirar a baseline original. O módulo oferece catálogo de objetivos, metas ponderadas, obras vinculadas, filtros, gráficos, exportação CSV/PDF, histórico de versões e arquivamento não destrutivo.

### Regra de segurança
- Administrador e Editor: criação e edição.
- Auditor e Consulta: leitura e exportação.
- Toda edição gera snapshot em `objetivo_versoes`.
- Arquivar não exclui o histórico.

### Aplicação
Execute `supabase/04_fase_7_objetivos_metas.sql` somente após as migrations anteriores.
