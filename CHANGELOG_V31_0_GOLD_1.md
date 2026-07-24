# CHANGELOG — SIGOM 2026 V31.0 GOLD.1

- Restringido EXECUTE de funções SECURITY DEFINER.
- Removido acesso direto de PUBLIC e anon.
- Mantido acesso autenticado somente para funções utilizadas pelo RLS.
- Search path fixado em `public, pg_temp`.
- Incluído tratamento opcional de `public.rls_auto_enable()`.
- Incluído script de verificação das permissões.
- Nenhuma tabela ou dado operacional é removido.
