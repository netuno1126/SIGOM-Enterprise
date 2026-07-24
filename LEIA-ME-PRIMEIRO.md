# SIGOM 2026 — V31.0 GOLD FUNCIONAL

Esta entrega é a versão web funcional consolidada para uso imediato, baseada na linha operacional V30.5.

## Funcionalidades disponíveis

- Login por e-mail e senha no Supabase;
- MFA/TOTP;
- perfis Administrador, Auditor, Editor e Consulta;
- dashboard-resumo;
- cadastro e consulta de obras;
- importação de XLSX/XLSM/XLS;
- atualização por Nº OPUS + contrato;
- grupos e subgrupos;
- administração de usuários;
- importação web de grupos;
- FIO online por obra;
- histórico de versões da FIO;
- fotografias no Supabase Storage;
- exportação individual de FIO;
- exportação de FIO por grupo;
- auditoria de alterações.

## Implantação rápida

1. Crie ou use o projeto Supabase configurado em `public/config.js`.
2. No SQL Editor, execute os scripts indicados em `supabase/00_ORDEM_DE_INSTALACAO.sql`.
3. Edite `supabase/06_promover_administrador_por_email.sql`, trocando `SEU_EMAIL_AQUI`.
4. Execute esse script para garantir o perfil de administrador.
5. No Netlify, use:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
6. Configure no Netlify:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
7. Publique o repositório.

## Teste mínimo antes do uso

- Entrar com o administrador;
- confirmar que a aba Administração aparece;
- importar uma planilha de teste;
- verificar as obras;
- criar um grupo;
- abrir uma FIO;
- salvar nova versão;
- testar exportação individual.

## Observação importante

Esta é a versão funcional disponível agora. Ela não incorpora automaticamente todas as telas avançadas do dashboard HTML legado; esses arquivos permanecem na pasta `legacy` como referência e contingência.
