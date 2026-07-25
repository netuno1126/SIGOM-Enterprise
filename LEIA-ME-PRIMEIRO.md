# SIGOM 2026 — V31.0 GOLD.1 FUNCIONAL

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


## Segurança GOLD.1

Antes do uso em produção, execute `supabase/07_v31_0_gold_1_security_hardening.sql`.

## Adaptação do Painel (dashboard aprovado → v31 online)

A aba **Painel** (antiga "Dashboard") agora inclui o motor visual completo do
dashboard HTML aprovado — Visão Geral (KPIs, resumo por contrato, gráficos,
tabela com filtros), Visão da Obra, Análises, Média Mensal Global, Saldos
Alongados e Portfólio — lendo os dados diretamente do Supabase (tabela
`obras`, campo `dados`) em vez de planilha local.

Arquivos novos/alterados:
- `public/assets/dashboard-legacy.js` — motor de visualização portado do
  dashboard aprovado (script clássico, carregado depois de `app.js`).
- `public/assets/app.css` — CSS do dashboard aprovado anexado, todo
  escopado sob `#sgLegacyRoot` (não afeta login/admin/grupos/FIO).
- `public/index.html` — Chart.js adicionado; markup do Painel embutido
  dentro da seção `page-dashboard`, sem remover nenhum elemento que o
  `app.js` original já usava.
- `public/assets/app.js` — pequena ponte `window.SIGOM = {...}` para o
  script clássico conseguir navegar/usar Grupos e FIO (que continuam
  100% no Supabase, sem duplicar lógica).

Limitações desta primeira adaptação:
- Geração de **PowerPoint** (FIO/portfólio) e **exportação Word** não
  foram portadas nesta etapa (dependiam de bibliotecas que o v31 não
  carrega); a impressão via navegador continua disponível.
- **Objetivos e Metas** e **Obras Paralisadas** (esta última já tem
  tabela `obras_paralisadas` pronta no schema) ainda não foram
  adaptados — ficam para uma próxima etapa.

## V31.1 — Persistência de Portfólio, Saldos Alongados e Nomes de Obra

Execute no Supabase SQL Editor (depois de `01_schema_rls.sql`):

```sql
supabase/09_v31_1_portfolio_saldos_nomes.sql
```

Três tabelas novas, com a mesma regra de acesso já usada em `obras`/`grupos`
(leitura para qualquer usuário autenticado; gravação só para administrador
ou editor):

- `portfolio_obras` — mesma forma da tabela `obras`; alimentada pelo botão
  **"📋 Portfólio (upload)"** do Painel.
- `saldos_alongados` — formato normalizado (uma linha por OM + Ano); a
  planilha original (matriz OM × Ano) é convertida automaticamente na
  gravação e reconstruída automaticamente na leitura. Alimentada pelo botão
  **"💰 Saldos (upload)"**.
- `nomes_obras` — mapa de nome curto por Nº OPUS (planilha
  `Principais_Obras.xlsx`, cabeçalho geralmente na linha 3). Alimentada
  pelo botão **"🏷 Nomes de obra (upload)"**.

Qualquer usuário com permissão de edição que fizer upload de uma dessas
três planilhas atualiza a base para **todos os usuários** — não é mais
por sessão/navegador. Ao abrir o Painel, os três conjuntos são
pré-carregados automaticamente do Supabase antes da primeira renderização;
o upload continua disponível para atualizar quando a planilha de origem
mudar.

