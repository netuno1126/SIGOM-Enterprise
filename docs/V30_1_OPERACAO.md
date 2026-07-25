# Operação da V30.1

## Perfis

- administrador: importa e consulta;
- editor: importa e consulta;
- auditor: consulta;
- consulta: consulta.

## Processo de importação

1. O navegador lê a planilha localmente usando SheetJS.
2. Nenhum arquivo Excel é colocado em área pública do Netlify.
3. As linhas são normalizadas e validadas.
4. O Supabase recebe lotes de 200 obras.
5. O banco executa `upsert` usando `opus, contrato`.
6. A importação fica registrada em `importacoes_planilha`.

## Conferência

Depois da importação, confira:

- quantidade de obras;
- valor atual total;
- filtros por RM e empresa;
- histórico da importação;
- registros com erro no painel de log.

## Limite de visualização

A tabela mostra até 1.000 linhas por vez no navegador, mas os indicadores e o CSV consideram toda a base filtrada carregada.
