# SIGOM — Fase 12.13 — Edição de usuários

## Alteração

Na Administração de Usuários, a coluna **Ação** passa a apresentar:

- **Editar** — habilita nome completo, nome de usuário, e-mail e perfil;
- **Salvar** — confirma as alterações no Supabase Auth e em `public.profiles`;
- **Desativar/Ativar** — mantém o controle de acesso existente.

## Segurança

A edição continua restrita ao perfil `administrador` e é executada pela Netlify Function `admin-users.mjs`, utilizando a chave administrativa apenas no servidor.

## Implantação

Não exige nova migration SQL. Confirme no Netlify as variáveis `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
