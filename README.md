# SIGOM — Sistema Integrado de Gestão de Obras Militares

Este é o **README único e consolidado** do repositório. As atualizações futuras devem alterar este arquivo, sem criar novos `README_FASE_*.md` na raiz.

## Versão atual

**Fase 12.19 — Persistência dos Saldos Alongados e documentação consolidada**

### Correções da Fase 12.19

- a importação de `Saldos_alongados_Dash.xlsx` grava definitivamente em `saldos_alongados_consolidado`;
- a mesma importação mantém a tabela anual `saldos_alongados` sincronizada;
- o importador confirma quantas linhas ficaram visíveis no Supabase antes de informar sucesso;
- falhas de RLS ou de persistência passam a aparecer no relatório de erros;
- o Dashboard usa a tabela consolidada como fonte principal e a tabela anual como contingência;
- ao concluir a importação, a aba aberta recebe um aviso para recarregar os dados;
- os dados permanecem disponíveis após `F5`, logout e novo login.

### SQL obrigatório desta versão

Execute no SQL Editor do Supabase, após as migrations anteriores:

```text
supabase/22_fase_12_19_persistencia_saldos_alongados.sql
```

O script é idempotente e não apaga registros existentes.

## Implantação

1. Faça backup do Supabase.
2. Execute as migrations ainda pendentes, terminando pela migration `22`.
3. Publique o conteúdo da pasta no GitHub.
4. Aguarde o deploy automático do Netlify ou use **Clear cache and deploy site**.
5. Atualize o navegador com `Ctrl + Shift + R`.
6. Importe novamente `Saldos_alongados_Dash.xlsx`.
7. Confirme no resultado a quantidade de linhas consolidadas e anuais visíveis.
8. Pressione `F5`, saia e entre novamente para validar a persistência.

## Fontes operacionais

- `obras`: Planilha de Obras;
- `portfolio_obras`: Planilha do Portfólio;
- `principais_obras`: nomes institucionais associados ao Nº OPUS;
- `saldos_alongados_consolidado`: matriz OM × exercícios 2016–2026;
- `saldos_alongados`: formato anual para gráficos e análises;
- `grupos` e `grupo_obras`: grupos e vínculos compartilhados;
- `fio_edicoes`: histórico da FIO.

## Regras institucionais preservadas

- a interface homologada não deve perder funções;
- os dados importados devem permanecer no Supabase;
- nenhuma atualização deve depender apenas de `localStorage`;
- a obra continua sendo identificada por Nº OPUS e contrato;
- `IDP = % medido ÷ % estimado`;
- valores financeiros usam o padrão `pt-BR`;
- Administrador e Editor gravam; Auditor e Consulta permanecem em leitura.

## Histórico consolidado

### Fases 12.14 a 12.18

- persistência e alternância real do Portfólio;
- Portfólio selecionado por padrão após o login;
- Média Mensal Global contextual e abreviada;
- estado inicial dos filtros padronizado;
- grupos da FIO carregados do Supabase;
- correção do PowerPoint da FIO com tabelas editáveis.

### Fases 12.5 a 12.13

- importação de Principais Obras;
- login por e-mail ou nome de usuário;
- menu institucional consolidado;
- PowerPoint editável da FIO;
- correção de percentuais;
- perfil e cadastro de usuários;
- edição, ativação e desativação de usuários.

### Fases 12.1 a 12.4

- modelo fiel da Planilha de Obras e do Portfólio;
- estrutura oficial de Saldos Alongados;
- Dashboard e FIO baseline ligados ao Supabase;
- grupos e operação online.

### Fases 1 a 11

- autenticação, MFA e perfis;
- Dashboard, Visão da Obra e análises;
- grupos e Portfólio;
- administração e importações;
- FIO online;
- Objetivos e Metas;
- Obras Paralisadas;
- Painel do Diretor;
- Pesquisa, Timeline e Alertas;
- IA e briefings assistivos.

## Segurança

Nunca publique no frontend:

- `SUPABASE_SERVICE_ROLE_KEY`;
- `OPENAI_API_KEY`;
- senhas ou tokens privados.

No navegador permanecem somente a URL do projeto e a chave publicável do Supabase.

## Documentação detalhada

Os marcos técnicos continuam em `docs/`. Eles complementam este README único, mas não devem ser duplicados em novos arquivos README na raiz.


## Fase 12.20 — IA no cabeçalho e Portfólio por Nº OPUS

- Botão **✨ IA** ao lado de **☰ Menu**, abrindo `/app/ia-sigom.html`.
- A IA usa a sessão autenticada e a Function `ai-sigom` sem alterar dados oficiais.
- Na importação do Portfólio, o contrato passa a ser opcional.
- O Nº OPUS é a chave mínima obrigatória.
- Registros repetidos com o mesmo Nº OPUS e contrato vazio são consolidados.
- Obras sem contrato permanecem visíveis após F5 e novo login.
- Execute `supabase/23_fase_12_20_portfolio_opus_sem_contrato.sql`.
- A documentação permanece consolidada neste único `README.md`.


## Fase 12.21 — Estabilidade do PPT da FIO e contingência de autenticação

- A exportação da FIO voltou a usar formas e caixas de texto editáveis, removendo tabelas OOXML que geravam arquivos recusados por algumas versões do Microsoft PowerPoint.
- Login por e-mail passa a autenticar diretamente no Supabase; a Netlify Function continua sendo usada somente para login por nome de usuário.
- Nenhum novo README paralelo foi criado.
