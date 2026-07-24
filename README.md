# SIGOM 2026 V30.3 — Obras e Importação Excel

Esta entrega acrescenta à fundação V30.0:

- dashboard ligado ao Supabase;
- listagem, pesquisa e filtros de obras;
- upload de XLSX/XLSM pelo navegador;
- detecção automática da aba de obras;
- normalização de nomes de colunas;
- atualização por `Nº OPUS + contrato`;
- preservação da linha original no campo JSON `dados`;
- importação em lotes de 200 registros;
- histórico de arquivos importados;
- registro do usuário responsável;
- exportação CSV respeitando os filtros da tela;
- UTF-8/Unicode para acentos e cedilha.

## Atualização do banco

Quem já executou a V30.0 deve executar apenas:

```text
supabase/03_v30_1_importacao_obras.sql
```

Não execute novamente o arquivo `01_schema_rls.sql` sobre o banco em produção.

## Primeiro teste

1. Publique a V30.3 no GitHub/Netlify.
2. Entre com usuário administrador ou editor.
3. Abra `Importações`.
4. Escolha a Planilha de Obras do SIGOM.
5. Confirme o processamento.
6. Abra `Obras` para conferir os dados.

## Chave de atualização

```text
Nº OPUS + contrato
```

Uma nova importação atualiza a obra existente e não cria duplicidade para a mesma chave.

## Colunas reconhecidas

O importador aceita variações dos seguintes nomes:

- Solicitação, Nº OPUS, Nr OPUS ou Código da Obra;
- Contrato ou Nº Contrato;
- RM;
- Contratante;
- OM Beneficiada;
- Descrição ou Descrição da Obra;
- Nome da Obra;
- Empresa, Fornecedor, Contratada ou Construtora;
- Valor Atual;
- Total NE;
- Total Notas Fiscais ou Total NF;
- % Medido;
- % Estimado.

As demais colunas continuam preservadas em `obras.dados`.

## Segurança

A chave `service_role` não é usada pelo importador do navegador. A escrita é autorizada pelas políticas RLS e pelo perfil do usuário autenticado.

## Correção do erro 42710 nas políticas

Se o SQL anterior já criou a tabela e apareceu a mensagem de que a política `importacoes_read` já existe, execute apenas:

```text
supabase/03A_correcao_politicas_importacao.sql
```

O arquivo principal `03_v30_1_importacao_obras.sql` também foi corrigido e agora pode ser executado novamente com segurança.


## V30.3
Execute `supabase/04_v30_2_grupos_usuarios.sql` e publique o projeto novamente no Netlify. Consulte `docs/V30_2_GRUPOS_USUARIOS.md`.


## Identidade visual V30.3

A tela de entrada foi padronizada conforme o modelo institucional fornecido, com as logos do DEC, DOM e SIGOM e o nome oficial **Sistema Integrado de Gestão de Obras Militares**. O nome curto exibido no cabeçalho permanece **SIGOM 2026**.
