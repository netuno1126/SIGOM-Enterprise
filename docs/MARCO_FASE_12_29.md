# SIGOM — Marco da Fase 12.29

## Escopo

- retorno seguro da FIO para `/app.html`;
- abertura correta da FIO por Nº OPUS e contrato;
- buscador por Nº OPUS na FIO;
- correção do botão **FIO desta obra**;
- exportação Word real em `.doc` por MHTML;
- gráficos Chart.js capturados em PNG e incorporados;
- PDF aguarda o carregamento das imagens antes da impressão;
- filtros e grupo selecionado preservados na exportação;
- identificação obrigatória da versão em `VERSAO.txt`.

## Arquivos principais

- `public/app/dashboard.html`;
- `public/app/fio.html`;
- `README.md`;
- `VERSAO.txt`.

## SQL

Nenhum SQL novo é necessário. A migration de MFA da Fase 12.27 permanece incluída apenas para instalações que ainda não possuam `profiles.mfa_obrigatorio`.
