# Implantação no GitHub e Netlify

## GitHub

1. Crie um repositório privado chamado `SIGOM-Enterprise`.
2. Envie todos os arquivos desta pasta, exceto `.env` e `node_modules`.
3. Ative autenticação em duas etapas na conta GitHub.
4. Proteja a branch principal e use Deploy Previews para mudanças futuras.

## Netlify

1. Selecione **Add new project > Import an existing project**.
2. Escolha GitHub e o repositório privado.
3. O `netlify.toml` já define:
   - build: `npm run build`
   - publish: `dist`
   - functions: `netlify/functions`
4. Em **Environment variables**, cadastre:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Faça o primeiro deploy.

## Supabase Auth

Inclua a URL do Netlify em:

- Authentication > URL Configuration > Site URL
- Redirect URLs

Exemplo:

```text
https://SEU-SITE.netlify.app
https://SEU-SITE.netlify.app/**
```

## Teste mínimo

1. Entrar com usuário criado.
2. Confirmar que o perfil aparece.
3. Configurar autenticador e validar código TOTP.
4. Sair e entrar novamente, confirmando exigência de AAL2.
5. Confirmar leitura das contagens do banco.
