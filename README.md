# SIGOM — Fase 12.3

Execute `supabase/15_fase_12_3_baselines_saldos_integral.sql` após as migrations anteriores.

A tela principal de Objetivos é a baseline original. A FIO é o HTML original. Ambas usam as bases oficiais importadas no Supabase.

# SIGOM — Fase 12.2.2

Correção do Dashboard GOLD para carregar as tabelas importadas no Supabase e exibir as logos DOM, SIGOM e DEC.

## Aplicação

1. Execute `supabase/14_fase_12_2_2_leitura_dashboard.sql`.
2. Publique o pacote no Netlify.
3. Use `Clear cache and deploy site`.
4. Atualize o navegador com `Ctrl+Shift+R`.

A interface e a FIO homologadas foram preservadas.

# SIGOM — Fase 12.2

Interface principal homologada pelo Dashboard SIGOM e FIO verdadeira integrada ao Supabase.

Execute, após as migrations anteriores:

`supabase/13_fase_12_2_dashboard_fio_verdadeira.sql`

O `index.html` continua responsável pelo login/MFA. Após autenticação, `app.html` abre diretamente o dashboard homologado em tela cheia.

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
