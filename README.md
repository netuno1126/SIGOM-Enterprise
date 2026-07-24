# SIGOM Enterprise 2026 — V30.0

Base inicial para migração do SIGOM local para Netlify + Supabase, mantendo a versão V29 em `legacy/` como contingência.

## Conteúdo

- `public/`: frontend inicial com login, sessão e MFA TOTP.
- `supabase/01_schema_rls.sql`: tabelas, perfis, RLS e bucket de fotos.
- `supabase/02_promover_primeiro_admin.sql`: promoção do primeiro administrador.
- `netlify/functions/admin-create-user.mjs`: criação protegida de usuários.
- `migracao/importar_grupos.mjs`: importação dos grupos atuais.
- `legacy/`: cópia dos HTMLs atuais, sem alteração.
- `docs/`: arquitetura, implantação e cronograma.

## Ordem de implantação

1. No Supabase, abra **SQL Editor** e execute `supabase/01_schema_rls.sql`.
2. Em **Authentication > Users**, crie seu primeiro usuário por e-mail e senha.
3. Edite e execute `supabase/02_promover_primeiro_admin.sql`.
4. Ative MFA TOTP em **Authentication > Multi-Factor Authentication**.
5. Crie um repositório GitHub privado e envie esta pasta.
6. No Netlify, importe o repositório.
7. Configure as variáveis:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
8. Faça o deploy.

## Segurança

A publishable key do Supabase pode ficar no frontend. A `service_role key` nunca deve ser incluída no GitHub, HTML ou mensagens. Ela só deve existir nas variáveis protegidas do Netlify e, temporariamente, no terminal local durante migrações administrativas.

## Situação desta entrega

A V30.0 entrega a fundação: autenticação, MFA, perfis, RLS, banco, Storage, Netlify e migração de grupos. Os dashboards completos da V29 ainda estão em `legacy/` e serão convertidos módulo por módulo nas versões V30.1 em diante.
