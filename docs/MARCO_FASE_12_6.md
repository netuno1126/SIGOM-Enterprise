# SIGOM — Fase 12.6

## Menu limpo e login por usuário

- Ações operacionais retiradas da faixa superior e mantidas no menu em cascata.
- Administração de usuários acessível pelo menu apenas para Administrador.
- Login aceita e-mail ou nome de usuário.
- Supabase Auth continua usando e-mail internamente.
- O nome de usuário é único e armazenado em `profiles.username`.
- A resolução de username para e-mail ocorre somente em Netlify Function protegida.
