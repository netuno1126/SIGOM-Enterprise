# SIGOM 2026 V30.2 — Grupos e usuários

## Atualização do banco
Execute apenas `supabase/04_v30_2_grupos_usuarios.sql` depois dos arquivos das versões anteriores. O script é idempotente.

## Funções Netlify
Mantenha `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` nas variáveis de ambiente do Netlify. Nunca coloque a service role no frontend.

## Migração dos grupos atuais
1. Importe primeiro a planilha de obras na tela **Importações**.
2. No terminal, dentro da pasta do projeto, defina as duas variáveis de ambiente.
3. Execute `node migracao/importar_grupos_v30_2.mjs migracao/grupos_obras_original.json`.
4. O resultado lista grupos importados, vínculos criados e obras não encontradas.

## Recursos
- grupos e subgrupos compartilhados;
- adicionar e remover obras;
- arquivar e desarquivar;
- busca;
- administração visual de usuários;
- perfis administrador, auditor, editor e consulta;
- ativação e desativação de contas;
- logs automáticos de grupos e vínculos.
