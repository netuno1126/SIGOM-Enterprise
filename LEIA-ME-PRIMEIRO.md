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

## V31.3 — Login público removido do dashboard clássico + limpar dados

**Login público removido.** `index.html`, `SIGOM_Mobile.html` e
`objetivos.html` (em `public/legado/`) não têm mais login próprio nem a
senha padrão embutida no código (`APGDOM`/`bemamigos`, `admin`/`sigom2024`
etc.). Agora eles verificam a sessão do Supabase (a mesma conta usada no
Painel v31): se você já está logado, entram direto; se não, mandam para
`/index.html` para fazer login por lá (com MFA quando você ativar).
Cadastro de usuário e troca de senha nesses arquivos também foram
redirecionados para a página Administração do Painel — é lá que continua
sendo feito, exatamente como você pediu.

**Novo: apagar dados de uma tabela.** Painel → Administração →
Importação de dados → card "🗑 Limpar dados". Escolha a tabela, digite
`APAGAR` para confirmar e um administrador pode zerar os registros de
qualquer uma das tabelas do SIGOM (obras, grupos, FIO, portfólio, saldos,
nomes de obra, obras paralisadas, auditoria, importações). Apaga só os
dados — a tabela continua existindo. Fica registrado em
`auditoria_logs`. Backend: `netlify/functions/admin-clear-table.mjs`
(lista fechada de tabelas permitidas, exige token de administrador).

**MFA (autenticação em dois fatores):** já existe pronto no Painel v31
(tela de login → "Configurar autenticador"). Quando quiser ativar para
todo mundo, é só cada usuário habilitar na própria conta.

## V31.2 — Dashboard clássico funcionando online (sem alterar nenhum HTML seu)

Seus arquivos `index.html`, `objetivos.html`, `fio_slide_SIGOM.html` e
`SIGOM_Mobile.html` (layout, FIO, geração de FIO, Objetivos e Metas — tudo
igual ao que você já usa) agora ficam publicados em `public/legado/`,
**sem nenhuma alteração no código deles** (exceto o login, corrigido na
V31.3 acima). Acesse pelo botão "Dashboard clássico" no topo do Painel
(abre em nova aba) ou direto em `/legado/index.html`.

Duas Netlify Functions novas fazem esses arquivos conversarem com o
Supabase, respondendo exatamente como o servidor local sempre respondeu —
**não precisa rodar nenhuma migração SQL nova**, elas usam as tabelas que
já existem (`grupos`, `grupo_obras`, `obras`, `fio_edicoes`):

- `netlify/functions/grupos.mjs` — atende `GET/POST /api/grupos` (e o
  fallback `POST /api/grupos/salvar` que o próprio dashboard já tenta).
  Reconstrói a mesma estrutura aninhada (grupos → subgrupos → obras por
  Nº OPUS) que o dashboard sempre usou; ao salvar, sincroniza
  criação/edição de grupos e vínculos de obras no Supabase.
- `netlify/functions/fio-edicoes.mjs` — atende `GET/POST /api/fio-edicoes`.
  Grava o HTML editado de cada FIO na tabela `fio_edicoes`, no campo
  `conteudo.html` — uma chave própria, que não conflita com o formulário
  de FIO do Painel (que usa `conteudo.status/summary/...`). As duas telas
  compartilham a tabela e o histórico de versão, mas não se sobrescrevem.

**Planilha de obras**: se `/api/xlsx?folder=` não responder (não
implementei essa função), o dashboard mostra o aviso já existente e você
escolhe o arquivo manualmente pelo botão "📂 Planilha de obras" — nada
quebra, só deixa de ser automático.

**Não implementado** (endpoints que dependiam só do servidor local, sem
relação com grupos/FIO/login): `/api/xlsx`, `/api/shutdown`,
`/api/session-heartbeat`. Avise se algum for importante para o uso online.

Importação de grupos gerados por fora continua no mesmo lugar de sempre:
Administração → Importação de dados → "Importar grupos antigos" (lê
`grupos_obras.json`, mesmo formato que `grupos.mjs` também entende).

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

