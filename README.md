# SIGOM — Sistema Integrado de Gestão de Obras Militares

Este é o **README único e consolidado** do repositório. As atualizações futuras devem alterar este arquivo, sem criar novos arquivos `README_FASE_*.md` na raiz.

## Versão atual

**Fase 12.29 — Retorno da FIO e exportações de análises com gráficos**

A versão atual consolida as correções operacionais, de autenticação, administração, IA, Dashboard, FIO, grupos, importações e segurança desenvolvidas após a Fase 12.19.

## Novidades da Fase 12.28

### MFA selecionável no cadastro

O formulário de criação de usuários possui a opção:

```text
☑ Exigir autenticação em dois fatores (MFA)
```

- marcada: o usuário deverá cadastrar e informar o código TOTP;
- desmarcada: o usuário entrará apenas com e-mail/nome de usuário e senha;
- a opção permanece marcada por padrão.

### MFA editável posteriormente

A tabela administrativa de usuários possui a coluna **MFA**, com as situações:

```text
Obrigatório
Dispensado
```

Ao clicar em **Editar**, o Administrador poderá marcar ou desmarcar a exigência e confirmar em **Salvar**.

A configuração é armazenada em:

```text
public.profiles.mfa_obrigatorio
```

Desativar a exigência não exclui automaticamente um fator TOTP já cadastrado no Supabase; apenas deixa de exigir AAL2 no acesso ao SIGOM.

## Autenticação

O SIGOM mantém uma única tela oficial de acesso.

Fluxo:

```text
Login inicial
→ autenticação Supabase
→ consulta do perfil
→ verificação da política individual de MFA
→ Dashboard completo
```

### Login por e-mail

O e-mail é autenticado diretamente pelo Supabase Auth.

### Login por nome de usuário

O nome de usuário é resolvido pela Netlify Function:

```text
netlify/functions/login-identifier.mjs
```

A senha utilizada é a mesma da conta de e-mail correspondente.

### Perfis

- Administrador;
- Editor;
- Auditor;
- Consulta.

A situação do usuário e a política de MFA são consultadas em `public.profiles` antes da abertura do sistema.

## Administração de usuários

A administração utiliza:

```text
netlify/functions/admin-users.mjs
public/app/administracao.html
public/app/administracao.js
```

O Administrador pode:

- listar usuários;
- criar usuário;
- definir nome completo;
- definir nome de usuário;
- definir e-mail;
- definir senha provisória;
- selecionar perfil;
- exigir ou dispensar MFA;
- editar os dados posteriormente;
- ativar ou desativar a conta.

As operações administrativas são realizadas pela Netlify Function. A `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser exposta no navegador.

## Correções posteriores à Fase 12.24

### Fase 12.25 — Dashboard restaurado

- corrigido o encerramento indevido do bloco JavaScript principal;
- removida a tag `</script>` inserida dentro do modelo de exportação;
- restaurados filtros, gráficos, abas, tabelas e exportações;
- mantido o login único sem remover funcionalidades do Dashboard.

### Fase 12.26 — IA SIGOM

- corrigida a rota da Function para:

```text
/api/ia-sigom
```

- respostas vazias ou HTML de erro deixam de causar `Unexpected end of JSON input`;
- o frontend passa a mostrar o código HTTP e a mensagem real da Function;
- o módulo mantém contexto de obras, FIO, objetivos, alertas e paralisações;
- a IA continua sem alterar dados oficiais automaticamente.

### Correções administrativas e Netlify Functions

- tratamento de respostas vazias e inválidas;
- mensagens administrativas específicas;
- correção do erro `HTTP 502` na inicialização;
- leitura segura das variáveis com `Netlify.env.get(...)`;
- fallback para `process.env`;
- respostas sempre em JSON;
- restauração da dependência:

```json
"@supabase/supabase-js": "^2.57.4"
```

### Fase 12.27 — MFA por usuário

- criada a coluna `profiles.mfa_obrigatorio`;
- a política global `requireMfa` passou a respeitar a configuração individual;
- usuários dispensados não são redirecionados para o cadastramento TOTP;
- usuários protegidos continuam exigindo sessão AAL2.

## FIO

A exportação PowerPoint permanece no modelo estável anterior às tabelas nativas:

- formas retangulares editáveis;
- caixas de texto editáveis;
- logos DEC e DOM incorporadas;
- quadro financeiro editável;
- PA, IDP e observações editáveis;
- sem uso de tabela OOXML nativa que possa corromper o arquivo.

A FIO consulta obras e grupos no Supabase e preserva o histórico de versões.

## Grupos

As tabelas oficiais são:

```text
grupos
grupo_obras
```

Administrador e Editor podem criar, editar e vincular obras. Auditor e Consulta permanecem em leitura.

Os grupos podem ser importados e exportados no formato:

```text
grupos_obras.json
```

## Fontes operacionais

- `obras`: Planilha de Obras;
- `portfolio_obras`: Planilha do Portfólio;
- `principais_obras`: nomes institucionais associados ao Nº OPUS;
- `saldos_alongados_consolidado`: matriz OM × exercícios 2016–2026;
- `saldos_alongados`: estrutura anual para gráficos;
- `grupos` e `grupo_obras`: grupos e vínculos;
- `fio_edicoes`: histórico da FIO;
- `objetivos`, `objetivo_metas` e `objetivo_obras`: Objetivos e Metas;
- `obras_paralisadas`: paralisações e recontratações;
- `alertas` e `timeline_eventos`: inteligência operacional;
- `profiles`: perfil, situação, username e política individual de MFA.

## Regras institucionais

- nenhuma funcionalidade homologada deve ser retirada;
- a obra permanece como entidade central;
- os dados devem persistir no Supabase após `F5`, logout e novo login;
- nenhuma operação institucional deve depender somente de `localStorage`;
- Portfólio aceita Nº OPUS sem contrato;
- valores financeiros usam o padrão `pt-BR`;
- percentuais são exibidos sem multiplicação indevida por 100;
- `IDP = % medido ÷ % estimado`;
- alterações relevantes devem ser auditadas;
- a documentação principal permanece neste único `README.md`.

## Importações

O fluxo institucional é:

```text
Selecionar arquivo
→ validar
→ conferir prévia
→ confirmar
→ gravar no Supabase
→ verificar persistência
→ atualizar Dashboard
```

Bases aceitas:

- Planilha de Obras;
- Planilha do Portfólio;
- Principais Obras;
- Saldos Alongados;
- Objetivos e Metas;
- Grupos em JSON.

O Nº OPUS é obrigatório. No Portfólio, o contrato é opcional.

## SQL e migrations relevantes

As migrations devem ser executadas em ordem e apenas quando ainda não aplicadas.

Últimas migrations:

```text
supabase/22_fase_12_19_persistencia_saldos_alongados.sql
supabase/23_fase_12_20_portfolio_opus_sem_contrato.sql
supabase/24_fase_12_23_edicao_admin_saneamento.sql
supabase/25_fase_12_27_mfa_por_usuario.sql
```

A migration `25` cria `profiles.mfa_obrigatorio`.

## Variáveis do Netlify

Obrigatórias para autenticação e administração:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Para a IA:

```text
OPENAI_API_KEY
```

`OPENAI_MODEL` é opcional quando a Function possui um modelo padrão.

No plano gratuito do Netlify, as variáveis podem ficar no escopo padrão do projeto.

## Segurança

Nunca publique no frontend ou no GitHub:

- `SUPABASE_SERVICE_ROLE_KEY`;
- `OPENAI_API_KEY`;
- senhas;
- tokens privados;
- códigos TOTP.

No frontend podem permanecer somente:

- URL pública do projeto Supabase;
- chave publicável do Supabase.

A Content Security Policy deve usar domínio curinga:

```text
https://*.supabase.co
wss://*.supabase.co
```

## Estrutura principal

```text
public/
├── index.html
├── app.html
├── auth.js
├── config.js
└── app/
    ├── dashboard.html
    ├── fio.html
    ├── objetivos.html
    ├── obras-paralisadas.html
    ├── administracao.html
    ├── administracao.js
    ├── ia-sigom.html
    ├── ia-sigom.js
    └── guia-usuario.html

netlify/
└── functions/
    ├── admin-users.mjs
    ├── login-identifier.mjs
    └── ai-sigom.mjs

supabase/
└── migrations SQL versionadas
```

## Implantação consolidada

1. Faça backup do Supabase.
2. Confirme se as migrations necessárias já foram executadas.
3. Substitua os arquivos funcionais no GitHub.
4. Atualize este mesmo `README.md`.
5. Faça um único commit.
6. Aguarde o deploy automático ou use **Clear cache and deploy site**.
7. Atualize o navegador com `Ctrl + Shift + R`.
8. Teste:
   - login por e-mail;
   - login por username;
   - usuário com MFA obrigatório;
   - usuário dispensado de MFA;
   - cadastro e edição de usuário;
   - grupos;
   - importações;
   - FIO;
   - IA;
   - gráficos e exportações.

## Histórico resumido

### Fases 12.19 a 12.28

- persistência dos Saldos Alongados;
- README único;
- IA no cabeçalho;
- Portfólio por Nº OPUS sem contrato;
- restauração do PowerPoint estável da FIO;
- correção de grupos e username;
- edição administrativa e saneamento de percentuais;
- login único;
- Guia Completo do Usuário;
- restauração do Dashboard;
- correção da rota da IA;
- estabilização das Functions administrativas;
- MFA individual por usuário;
- seletor de MFA no cadastro e na edição.

### Fases 12.1 a 12.18

- tabelas fiéis às planilhas operacionais;
- Portfólio persistente;
- Principais Obras;
- Saldos Alongados;
- menu institucional;
- grupos online;
- nomes das obras;
- login por username;
- edição de usuários;
- Média Mensal Global contextual;
- FIO por grupo;
- correções iniciais do PowerPoint.

### Fases 1 a 11

- fundação web;
- autenticação e perfis;
- Dashboard conectado ao Supabase;
- Visão da Obra e gráficos;
- grupos e Portfólio;
- administração e importações;
- FIO online;
- Objetivos e Metas;
- Obras Paralisadas;
- Painel do Diretor;
- Pesquisa Global, Timeline e Alertas;
- IA e briefings assistivos.

## Documentação

A documentação detalhada permanece em:

```text
docs/
```

Ela complementa este README, mas não deve gerar novos arquivos `README_FASE_*.md` na raiz.


## Fase 12.29 — Retorno da FIO e exportações com gráficos

### Retorno da FIO

O botão **↩ Dashboard** da FIO não aponta mais para o arquivo inexistente:

```text
/app/dashboard_SIGOM.html
```

Quando a FIO foi aberta pelo Dashboard, o botão retorna à janela original e fecha a aba da FIO. Quando foi aberta diretamente, o retorno ocorre por:

```text
/app.html
```

Assim a sessão Supabase e a política individual de MFA são validadas antes de carregar o Dashboard.

### Exportação das análises

A exportação da aba **Análises** passa a:

- respeitar o grupo, Portfólio e demais filtros selecionados;
- aguardar a conclusão do desenho do Chart.js;
- interromper animações antes da captura;
- capturar cada canvas em PNG de alta resolução;
- aplicar fundo branco à imagem;
- incorporar os gráficos no documento Word;
- aguardar o carregamento das imagens antes de abrir a impressão/PDF;
- manter as tabelas de dados abaixo de cada gráfico.

O Word é gerado como documento compatível `.doc`, com imagens incorporadas por MHTML. O PDF continua sendo gerado pela impressão do navegador.

### Versão do pacote

Todos os pacotes posteriores deverão conter:

```text
VERSAO.txt
```

com número da fase, data, finalidade e commit recomendado.

### Busca por Nº OPUS na FIO

- campo **Buscar Nº OPUS** incluído na barra da FIO;
- busca exata e busca parcial pelo número normalizado;
- tecla Enter ou botão **Buscar OPUS** abre a obra localizada;
- o parâmetro `?opus=` vindo da Visão da Obra passa a abrir a obra correta, sem retornar à primeira obra.

### Botão FIO desta obra

- os atalhos do Dashboard passaram a abrir `/app/fio.html`;
- Nº OPUS e contrato são enviados na URL;
- o botão **FIO desta obra** da Visão da Obra volta a funcionar;
- o retorno da FIO utiliza a aba original ou `/app.html`, sem apontar para `dashboard_SIGOM.html`.


## Fase 12.30 — Correção do download Word das Análises

- o botão **Exportar Word** abre imediatamente o seletor nativo **Salvar como** no Chrome e no Edge;
- a captura assíncrona dos gráficos ocorre depois da escolha do arquivo, evitando bloqueio silencioso do navegador;
- o documento continua sendo gerado no formato `.doc` compatível com Microsoft Word;
- gráficos e tabelas permanecem incorporados;
- o grupo, Portfólio e demais filtros selecionados permanecem respeitados;
- navegadores sem `showSaveFilePicker` utilizam download por `Blob`;
- há link manual de contingência quando o download automático é bloqueado;
- nenhuma alteração no Supabase é necessária.


## Fase 12.31 — Editor com gestão operacional completa e Ajuda para todos

### Perfil Editor

O perfil **Editor** passa a ter a mesma visão operacional do Administrador para:

- criar grupos;
- criar subgrupos;
- renomear grupos;
- adicionar e remover obras;
- arquivar e desarquivar grupos;
- esvaziar e excluir grupos;
- importar e exportar grupos;
- editar tabelas e configurações operacionais;
- acessar as ferramentas de operação do Dashboard.

O Editor continua sem permissão para:

- criar usuários;
- editar usuários;
- ativar ou desativar usuários;
- excluir usuários;
- alterar perfil, e-mail, senha provisória ou MFA de outras contas.

A gestão de usuários permanece exclusiva do perfil **Administrador** e protegida pela Netlify Function `admin-users`.

### Perfil Auditor

O perfil **Auditor** permanece em modo de leitura:

- pode visualizar grupos e subgrupos;
- pode consultar obras, FIO, análises e relatórios;
- não pode criar, editar, arquivar ou excluir grupos.

### Ajuda

O botão:

```text
❓ Guia completo do usuário
```

fica visível para todos os perfis autenticados:

- Administrador;
- Editor;
- Auditor;
- Consulta.

### Banco de dados

Nenhuma migration nova é necessária. As políticas do Supabase já permitem gravação operacional para Administrador e Editor.


## Fase 12.32 — Correção do versionamento da FIO

### Problema corrigido

Ao salvar uma nova edição da FIO, o Supabase retornava:

```text
duplicate key value violates unique constraint "fio_edicoes_obra_id_unique"
```

A tabela possuía uma restrição incorreta:

```text
UNIQUE (obra_id)
```

Essa regra permitia somente uma FIO por obra e impedia o histórico.

### Estrutura correta

A FIO passa a usar:

```text
UNIQUE (obra_id, versao)
```

Assim, cada obra pode possuir versões sucessivas, sem substituir ou apagar as anteriores.

### Proteção adicional no frontend

O módulo `fio-save-version-fix.js`:

1. consulta a maior versão diretamente no Supabase;
2. calcula a próxima versão;
3. salva uma nova linha;
4. em conflito `23505`, tenta novamente com o número seguinte;
5. preserva as edições já existentes.

### Supabase operacional

A correção já foi aplicada diretamente no projeto atual. O SQL do pacote deve ser usado somente em outra instalação ou recuperação.

### Atualizações consolidadas

Esta versão também contém a Fase 12.31 ainda não publicada:

- Editor com gestão completa de grupos e subgrupos;
- gestão de usuários exclusiva do Administrador;
- botão Ajuda para todos os perfis.


## Fase 12.33 — Objetivos e Metas integrados ao Supabase

- consolida integralmente as Fases 12.31 e 12.32 ainda não publicadas;
- usa as mesmas tabelas `obras` e `portfolio_obras` do Dashboard;
- salva observações e estado atual em `objetivos_auditoria`;
- registra cada alteração em `objetivos_auditoria_historico`;
- permite abrir a FIO diretamente pelo Nº OPUS e contrato;
- cria histórico de medições em `objetivos_indicadores_medicoes`;
- Administrador e Editor gravam; Auditor e Consulta leem.

### Objetivo 3 — RPNP

```text
% RPNP Cancelados = RPNP Cancelados ÷ RPNP Inscritos × 100
```

Exemplo da referência recebida:

```text
RPNP Inscritos: 226.830.970,87
RPNP Cancelados: 1.290.032,08
Resultado: 0,5687%
Exibição com uma casa decimal: 0,6%
```

A migration `fase_12_33_objetivos_auditoria_indicadores_rpnp` já foi aplicada no Supabase operacional.


## Fase 12.33 Institucional — Exportações da FIO

As exportações da FIO passam a respeitar as alterações manuais.

### Ordem de prioridade

```text
conteúdo visível da obra atual
→ última edição salva da obra
→ dados originais das planilhas
```

### PDF individual

O PDF individual utiliza exatamente o conteúdo exibido na FIO no momento da impressão, incluindo alterações ainda não salvas.

### PDF por grupo

Cada obra do grupo é materializada com sua última edição salva. Obras sem edição usam a base oficial.

### PowerPoint individual e por grupo

O PowerPoint extrai da FIO editada:

- título;
- Nº OPUS e ação orçamentária;
- características;
- início;
- empresa;
- valor total;
- empenho;
- saldo de empenho;
- executado;
- medição mensal;
- entrega projetada;
- PA;
- IDP;
- observações e problemas;
- fotografia.

As caixas do PowerPoint permanecem editáveis. A fotografia é incorporada como imagem.
