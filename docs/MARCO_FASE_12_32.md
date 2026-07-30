# SIGOM — Marco da Fase 12.32

## Correção da FIO

A restrição `fio_edicoes_obra_id_unique` impedia mais de uma edição por obra.
Ela foi removida. A unicidade correta permanece em `(obra_id, versao)`.

## Fluxo de salvamento

1. consultar a maior versão da obra;
2. calcular a versão seguinte;
3. inserir uma nova linha;
4. em conflito `23505`, incrementar a versão;
5. repetir até três vezes;
6. preservar todas as versões anteriores.

## Permissões consolidadas

- Administrador: operação completa e gestão de usuários;
- Editor: operação completa, grupos e subgrupos;
- Auditor: leitura;
- Consulta: leitura;
- Ajuda: todos os perfis.

## Banco

A migration foi aplicada diretamente no Supabase operacional.
