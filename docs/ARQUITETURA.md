# Arquitetura SIGOM 2026

```text
Usuário autenticado
      │
      ▼
Netlify CDN ── frontend HTML/JS
      │
      ├── Supabase Auth (senha + TOTP/AAL2)
      ├── Postgres com RLS
      ├── Storage privado para fotos da FIO
      └── Netlify Functions para ações administrativas
```

## Princípios

1. O navegador nunca recebe a chave `service_role`.
2. Toda tabela exposta ao frontend usa Row Level Security.
3. Usuários de consulta apenas leem; auditores atualizam auditoria; editores alteram dados operacionais; administradores gerenciam usuários.
4. Grupos, FIO e observações deixam de depender de `localStorage` e arquivos JSON locais.
5. A versão local permanece disponível durante toda a migração.

## Perfis

- `administrador`: acesso integral e administração de usuários.
- `auditor`: leitura geral e atualização de auditoria/objetivos.
- `editor`: leitura e edição de obras, grupos, FIO e paralisadas.
- `consulta`: somente leitura e exportação.

## MFA

O fluxo usa TOTP. Após senha válida, usuários com fator verificado precisam elevar a sessão de AAL1 para AAL2. O frontend inicial já contém os fluxos de cadastro e verificação.
