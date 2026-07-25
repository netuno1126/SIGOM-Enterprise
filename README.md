# SIGOM — Fase 11 IA e Briefings Inteligentes

Esta entrega preserva as Fases 1 a 10 e adiciona a IA SIGOM assistiva.

## Implantação
1. Execute `supabase/08_fase_11_ia_sigom.sql`.
2. No Netlify, configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `OPENAI_API_KEY` e, opcionalmente, `OPENAI_MODEL`.
3. Faça deploy de preview e execute o checklist.

Sem `OPENAI_API_KEY`, o módulo funciona em modo local limitado para validar a integração.

# SIGOM — Fase 10

Pesquisa Global, Timeline e Alertas Inteligentes, construída sobre a Fase 9.

## Implantação
1. Execute `supabase/07_fase_10_pesquisa_timeline_alertas.sql` após as migrations anteriores.
2. Publique o pacote em ambiente de preview do Netlify.
3. Homologue com `testes/CHECKLIST_FASE_10.md`.
4. Somente depois promova para produção.

## Segurança
A chave `service_role` não existe no frontend. RLS permanece habilitado. Administrador e Editor podem tratar alertas; Auditor e Consulta permanecem em leitura.


# Fase 12 — Modelo de Dados Definitivo e Motor de Fórmulas

A planilha oficial `Planilha de Obras_Dash.xlsx` passa a ser a referência do modelo operacional. A migration `09_fase_12_modelo_dados_formulas.sql` acrescenta os 51 campos normalizados, o histórico de medições e o motor de fórmulas.

Regra institucional: `IDP = % medido / % estimado`.

Consulte `README_FASE_12.md` antes da implantação.
