# SIGOM — Fase 12.17

## FIO com grupos do Supabase

Esta correção conecta a FIO original às tabelas `grupos` e `grupo_obras`.

### Comportamento

- O seletor **Grupo/Subgrupo** é preenchido após o login.
- Grupos arquivados não são exibidos.
- Subgrupos são mostrados abaixo do grupo pai.
- A quantidade de obras aparece em cada opção.
- Ao selecionar um grupo, o seletor **Obra do grupo** mostra somente as obras vinculadas.
- O vínculo é resolvido pelo `obra_id` e convertido para a chave operacional `Nº OPUS|Contrato` usada pela FIO.
- PDF e PowerPoint por grupo passam a usar os vínculos carregados do Supabase.

### Fonte oficial

- `public.grupos`
- `public.grupo_obras`
- `public.obras` / `public.obras_indicadores`
- `public.portfolio_obras`

### Implantação

Não há migration nova. É necessário que as políticas RLS das tabelas de grupos permitam leitura ao usuário autenticado, conforme a migration da Fase 12.4.
