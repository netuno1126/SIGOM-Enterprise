# SIGOM 2026 V30.4 — Administração de dados

## Recurso principal

A migração de `grupos_obras.json` agora ocorre pela interface web:

1. Entre com perfil Administrador.
2. Abra Administração.
3. Selecione Importação de dados.
4. Escolha `grupos_obras.json`.
5. Clique em Importar grupos.

O sistema cria ou atualiza grupos e subgrupos, corrige textos, procura as obras por OPUS + contrato e oferece CSV das obras não encontradas.

## Pré-requisito do Netlify

Mantenha configuradas as variáveis:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Não é necessário executar SQL adicional nesta versão.
