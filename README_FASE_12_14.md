# SIGOM — Fase 12.14

Correções:

- não exibe aviso de Portfólio vazio antes do término da consulta ao Supabase;
- usa `opus,contrato` como chave estável de upsert do Portfólio;
- quando um lote falha, testa as linhas individualmente e grava as válidas;
- mostra o erro real com linha, chave e código;
- permite baixar relatório CSV dos erros;
- confirma a quantidade de registros visíveis em `portfolio_obras` após a gravação.

## Implantação

1. Execute `supabase/20_fase_12_14_portfolio_upsert_persistente.sql`.
2. Publique os arquivos no Netlify com limpeza de cache.
3. Importe novamente a Planilha do Portfólio.
4. O resultado deve informar `97 registros gravados; 0 erros` e a quantidade visível na tabela.

Se a migration acusar duplicidade, execute a consulta de diagnóstico no final do SQL e resolva os registros duplicados antes de criar o índice.
