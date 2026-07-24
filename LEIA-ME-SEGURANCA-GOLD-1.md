# SIGOM 2026 — V31.0 GOLD.1

## Correção dos avisos do Conselheiro de Segurança do Supabase

A V31.0 GOLD.1 adiciona um endurecimento de segurança para as funções
`SECURITY DEFINER`, preservando o funcionamento do SIGOM.

### Aplicação em banco já instalado

No Supabase:

1. Abra **SQL Editor**.
2. Execute:
   `supabase/07_v31_0_gold_1_security_hardening.sql`
3. Execute:
   `supabase/08_verificar_seguranca_funcoes.sql`
4. Abra:
   **Database → Advisors → Security Advisor**
5. Clique em **Atualizar** ou **Reprise Linter**.

### Permissões esperadas

As funções abaixo continuam disponíveis para usuários autenticados porque são
usadas pelas políticas RLS:

- `meu_perfil()`
- `pode_editar()`
- `pode_auditar()`

As funções de trigger ficam sem permissão de execução direta para
`PUBLIC`, `anon` e `authenticated`:

- `handle_new_user()`
- `registrar_importacao_auditoria()`
- `audit_grupos_v30_2()`
- `audit_grupo_obras_v30_2()`
- `registrar_fio_auditoria()`

### Observação

O script não exclui tabelas, usuários, obras, grupos ou FIO. Ele modifica apenas
permissões de execução e o `search_path` das funções indicadas.
