-- SIGOM Fase 12.11 — correção da escala dos percentuais
-- Corrige somente valores evidentemente multiplicados por 100 nas importações antigas.
-- Exemplo: 9377 -> 93,77. Não altera valores normais como 93,77 ou 101,10.
begin;

do $$
declare
  tabela text;
  coluna text;
  colunas text[] := array[
    'percentual_estimado','percentual_medido','percentual_quarta',
    'percentual_antepenultima','percentual_penultima','percentual_ultima',
    'percentual_empenhado','percentual_atraso'
  ];
begin
  foreach tabela in array array['obras','portfolio_obras'] loop
    if to_regclass('public.'||tabela) is null then continue; end if;
    foreach coluna in array colunas loop
      if exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name=tabela and column_name=coluna
          and data_type in ('numeric','real','double precision','integer','bigint','smallint')
      ) then
        execute format(
          'update public.%I set %I = %I / 100.0 where abs(%I) > 1000 and abs(%I) <= 10000',
          tabela,coluna,coluna,coluna,coluna
        );
      end if;
    end loop;
  end loop;
end $$;

-- Recalcula o IDP oficial: % medido / % estimado.
do $$
declare tabela text;
begin
  foreach tabela in array array['obras','portfolio_obras'] loop
    if to_regclass('public.'||tabela) is null then continue; end if;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name=tabela and column_name='idp')
       and exists(select 1 from information_schema.columns where table_schema='public' and table_name=tabela and column_name='percentual_medido')
       and exists(select 1 from information_schema.columns where table_schema='public' and table_name=tabela and column_name='percentual_estimado') then
      execute format(
        'update public.%I set idp = case when coalesce(percentual_estimado,0) <> 0 then percentual_medido / percentual_estimado else null end',
        tabela
      );
    end if;
  end loop;
end $$;

commit;
