# SIGOM — Fase 10

Pesquisa Global, Timeline e Alertas Inteligentes, construída sobre a Fase 9.

## Implantação
1. Execute `supabase/07_fase_10_pesquisa_timeline_alertas.sql` após as migrations anteriores.
2. Publique o pacote em ambiente de preview do Netlify.
3. Homologue com `testes/CHECKLIST_FASE_10.md`.
4. Somente depois promova para produção.

## Segurança
A chave `service_role` não existe no frontend. RLS permanece habilitado. Administrador e Editor podem tratar alertas; Auditor e Consulta permanecem em leitura.
