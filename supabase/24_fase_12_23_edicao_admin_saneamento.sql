-- SIGOM Fase 12.23
-- Aplicado em produção: edição administrativa auditada e saneamento conservador x100.
-- Este arquivo é idempotente e não exclui obras.

begin;

create or replace function public.sigom_num_or_null(p_text text)
returns numeric
language sql
immutable
set search_path = pg_catalog
as $$
  select case when btrim(coalesce(p_text,'')) ~ '^-?[0-9]+([.,][0-9]+)?$'
    then replace(btrim(p_text),',','.')::numeric else null end
$$;

revoke all on function public.sigom_num_or_null(text) from public, anon;
grant execute on function public.sigom_num_or_null(text) to authenticated;

-- Corrige somente relações exatas de 100 vezes entre coluna normalizada e JSON de origem.
update public.obras o set
  percentual_medido=case when public.sigom_num_or_null(o.dados->>'% medido') between 0 and 100 and o.percentual_medido=public.sigom_num_or_null(o.dados->>'% medido')*100 then public.sigom_num_or_null(o.dados->>'% medido') else o.percentual_medido end,
  percentual_estimado=case when public.sigom_num_or_null(o.dados->>'% estimado') between 0 and 100 and o.percentual_estimado=public.sigom_num_or_null(o.dados->>'% estimado')*100 then public.sigom_num_or_null(o.dados->>'% estimado') else o.percentual_estimado end,
  valor_atual=case when o.valor_atual=public.sigom_num_or_null(o.dados->>'Valor Atual')*100 then public.sigom_num_or_null(o.dados->>'Valor Atual') else o.valor_atual end,
  valor_inicial=case when o.valor_inicial=public.sigom_num_or_null(o.dados->>'Valor Inicial')*100 then public.sigom_num_or_null(o.dados->>'Valor Inicial') else o.valor_inicial end,
  valor_aditivado=case when o.valor_aditivado=public.sigom_num_or_null(o.dados->>'Valor Aditivado')*100 then public.sigom_num_or_null(o.dados->>'Valor Aditivado') else o.valor_aditivado end,
  valor_apostilado=case when o.valor_apostilado=public.sigom_num_or_null(o.dados->>'Valor Apostilado')*100 then public.sigom_num_or_null(o.dados->>'Valor Apostilado') else o.valor_apostilado end,
  valor_contratado=case when o.valor_contratado=public.sigom_num_or_null(o.dados->>'Valor Contratado')*100 then public.sigom_num_or_null(o.dados->>'Valor Contratado') else o.valor_contratado end,
  valor_solicitacao=case when o.valor_solicitacao=public.sigom_num_or_null(o.dados->>'Valor Solicitação')*100 then public.sigom_num_or_null(o.dados->>'Valor Solicitação') else o.valor_solicitacao end,
  total_ne=case when o.total_ne=public.sigom_num_or_null(o.dados->>'Total NE')*100 then public.sigom_num_or_null(o.dados->>'Total NE') else o.total_ne end,
  total_nf=case when o.total_nf=public.sigom_num_or_null(o.dados->>'Total Notas Fiscais')*100 then public.sigom_num_or_null(o.dados->>'Total Notas Fiscais') else o.total_nf end,
  total_notas_fiscais=case when o.total_notas_fiscais=public.sigom_num_or_null(o.dados->>'Total Notas Fiscais')*100 then public.sigom_num_or_null(o.dados->>'Total Notas Fiscais') else o.total_notas_fiscais end,
  atualizado_em=now()
where
  o.percentual_medido=public.sigom_num_or_null(o.dados->>'% medido')*100
  or o.percentual_estimado=public.sigom_num_or_null(o.dados->>'% estimado')*100
  or o.valor_atual=public.sigom_num_or_null(o.dados->>'Valor Atual')*100
  or o.valor_inicial=public.sigom_num_or_null(o.dados->>'Valor Inicial')*100
  or o.valor_aditivado=public.sigom_num_or_null(o.dados->>'Valor Aditivado')*100
  or o.valor_apostilado=public.sigom_num_or_null(o.dados->>'Valor Apostilado')*100
  or o.valor_contratado=public.sigom_num_or_null(o.dados->>'Valor Contratado')*100
  or o.valor_solicitacao=public.sigom_num_or_null(o.dados->>'Valor Solicitação')*100
  or o.total_ne=public.sigom_num_or_null(o.dados->>'Total NE')*100
  or o.total_nf=public.sigom_num_or_null(o.dados->>'Total Notas Fiscais')*100
  or o.total_notas_fiscais=public.sigom_num_or_null(o.dados->>'Total Notas Fiscais')*100;

create or replace function public.sigom_editar_obra_admin(p_obra_id uuid,p_alteracoes jsonb,p_motivo text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_antes jsonb; v_depois jsonb; v_opus text; v_contrato text;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and ativo=true and perfil='administrador'::public.perfil_sigom) then
    raise exception 'Somente Administrador pode editar diretamente os dados das obras.' using errcode='42501';
  end if;
  if btrim(coalesce(p_motivo,''))='' then raise exception 'O motivo é obrigatório.'; end if;
  select to_jsonb(o),o.opus,o.contrato into v_antes,v_opus,v_contrato from public.obras o where id=p_obra_id for update;
  if v_antes is null then raise exception 'Obra não encontrada.'; end if;
  update public.obras o set
    rm=case when p_alteracoes?'rm' then nullif(p_alteracoes->>'rm','') else o.rm end,
    contratante=case when p_alteracoes?'contratante' then nullif(p_alteracoes->>'contratante','') else o.contratante end,
    om_beneficiada=case when p_alteracoes?'om_beneficiada' then nullif(p_alteracoes->>'om_beneficiada','') else o.om_beneficiada end,
    empresa=case when p_alteracoes?'empresa' then nullif(p_alteracoes->>'empresa','') else o.empresa end,
    descricao=case when p_alteracoes?'descricao' then nullif(p_alteracoes->>'descricao','') else o.descricao end,
    nome_obra=case when p_alteracoes?'nome_obra' then nullif(p_alteracoes->>'nome_obra','') else o.nome_obra end,
    percentual_estimado=case when p_alteracoes?'percentual_estimado' then nullif(p_alteracoes->>'percentual_estimado','')::numeric else o.percentual_estimado end,
    percentual_medido=case when p_alteracoes?'percentual_medido' then nullif(p_alteracoes->>'percentual_medido','')::numeric else o.percentual_medido end,
    valor_solicitacao=case when p_alteracoes?'valor_solicitacao' then nullif(p_alteracoes->>'valor_solicitacao','')::numeric else o.valor_solicitacao end,
    valor_contratado=case when p_alteracoes?'valor_contratado' then nullif(p_alteracoes->>'valor_contratado','')::numeric else o.valor_contratado end,
    valor_inicial=case when p_alteracoes?'valor_inicial' then nullif(p_alteracoes->>'valor_inicial','')::numeric else o.valor_inicial end,
    valor_aditivado=case when p_alteracoes?'valor_aditivado' then nullif(p_alteracoes->>'valor_aditivado','')::numeric else o.valor_aditivado end,
    valor_apostilado=case when p_alteracoes?'valor_apostilado' then nullif(p_alteracoes->>'valor_apostilado','')::numeric else o.valor_apostilado end,
    valor_atual=case when p_alteracoes?'valor_atual' then nullif(p_alteracoes->>'valor_atual','')::numeric else o.valor_atual end,
    total_nc=case when p_alteracoes?'total_nc' then nullif(p_alteracoes->>'total_nc','')::numeric else o.total_nc end,
    total_ne=case when p_alteracoes?'total_ne' then nullif(p_alteracoes->>'total_ne','')::numeric else o.total_ne end,
    total_nf=case when p_alteracoes?'total_nf' then nullif(p_alteracoes->>'total_nf','')::numeric else o.total_nf end,
    total_notas_fiscais=case when p_alteracoes?'total_nf' then nullif(p_alteracoes->>'total_nf','')::numeric else o.total_notas_fiscais end,
    percentual_empenhado=case when p_alteracoes?'percentual_empenhado' then nullif(p_alteracoes->>'percentual_empenhado','')::numeric else o.percentual_empenhado end,
    falta_empenhar=case when p_alteracoes?'falta_empenhar' then nullif(p_alteracoes->>'falta_empenhar','')::numeric else o.falta_empenhar end,
    saldo_descentralizar=case when p_alteracoes?'saldo_descentralizar' then nullif(p_alteracoes->>'saldo_descentralizar','')::numeric else o.saldo_descentralizar end,
    idp=case when p_alteracoes?'idp' then nullif(p_alteracoes->>'idp','')::numeric else o.idp end,
    obs=case when p_alteracoes?'obs' then nullif(p_alteracoes->>'obs','') else o.obs end,
    acao_orcamentaria=case when p_alteracoes?'acao_orcamentaria' then nullif(p_alteracoes->>'acao_orcamentaria','') else o.acao_orcamentaria end,
    dias_atrasados=case when p_alteracoes?'dias_atrasados' then nullif(p_alteracoes->>'dias_atrasados','')::integer else o.dias_atrasados end,
    percentual_atraso=case when p_alteracoes?'percentual_atraso' then nullif(p_alteracoes->>'percentual_atraso','')::numeric else o.percentual_atraso end,
    media_medicao_3=case when p_alteracoes?'media_medicao_3' then nullif(p_alteracoes->>'media_medicao_3','')::numeric else o.media_medicao_3 end,
    media_mensal_global=case when p_alteracoes?'media_mensal_global' then nullif(p_alteracoes->>'media_mensal_global','')::numeric else o.media_mensal_global end,
    analise=case when p_alteracoes?'analise' then nullif(p_alteracoes->>'analise','') else o.analise end,
    media_90_dias=case when p_alteracoes?'media_90_dias' then nullif(p_alteracoes->>'media_90_dias','')::numeric else o.media_90_dias end,
    saldo_empenho=case when p_alteracoes?'saldo_empenho' then nullif(p_alteracoes->>'saldo_empenho','')::numeric else o.saldo_empenho end,
    atualizado_por=auth.uid(),atualizado_em=now()
  where id=p_obra_id returning to_jsonb(o) into v_depois;
  update public.portfolio_obras p set
    rm=v_depois->>'rm',contratante=v_depois->>'contratante',om_beneficiada=v_depois->>'om_beneficiada',empresa=v_depois->>'empresa',
    descricao=v_depois->>'descricao',nome_obra=v_depois->>'nome_obra',percentual_estimado=(v_depois->>'percentual_estimado')::numeric,
    percentual_medido=(v_depois->>'percentual_medido')::numeric,valor_atual=(v_depois->>'valor_atual')::numeric,total_ne=(v_depois->>'total_ne')::numeric,
    total_nf=(v_depois->>'total_nf')::numeric,total_notas_fiscais=(v_depois->>'total_notas_fiscais')::numeric,
    percentual_empenhado=(v_depois->>'percentual_empenhado')::numeric,falta_empenhar=(v_depois->>'falta_empenhar')::numeric,
    saldo_descentralizar=(v_depois->>'saldo_descentralizar')::numeric,idp=(v_depois->>'idp')::numeric,obs=v_depois->>'obs',
    atualizado_por=auth.uid(),atualizado_em=now()
  where p.obra_id=p_obra_id or (regexp_replace(coalesce(p.opus,p.nr_solicitacao,''),'\D','','g')=regexp_replace(coalesce(v_opus,''),'\D','','g') and coalesce(p.contrato,p.nr_contrato,'')=coalesce(v_contrato,''));
  insert into public.auditoria_logs(usuario_id,acao,entidade,entidade_id,antes,depois)
  values(auth.uid(),'EDICAO_MANUAL_TABELA','obras',p_obra_id::text,v_antes,v_depois||jsonb_build_object('_motivo',p_motivo));
  return jsonb_build_object('ok',true,'obra_id',p_obra_id,'alteracoes',p_alteracoes);
end $$;

revoke all on function public.sigom_editar_obra_admin(uuid,jsonb,text) from public,anon;
grant execute on function public.sigom_editar_obra_admin(uuid,jsonb,text) to authenticated;

commit;
