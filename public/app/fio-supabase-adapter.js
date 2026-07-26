(() => {
  const cfg=window.SIGOM_CONFIG||parent?.SIGOM_CONFIG;
  const sb=window.supabase?.createClient&&cfg?window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey):null;
  const v=(o,...ks)=>{for(const k of ks){if(o?.[k]!==null&&o?.[k]!==undefined&&o?.[k]!=='')return o[k]}return null};
  function map(o){const d=o.dados_origem||o.dados||{};return {
    id:o.id,obra_id:o.obra_id||o.id,'RM':v(o,'rm')??d.RM,'Contratante':v(o,'contratante')??d.Contratante,'OM Beneficiada':v(o,'om_beneficiada')??d['OM Beneficiada'],
    'Contrato':v(o,'nr_contrato','contrato')??d['Nr Contrato'],'Solicitação':v(o,'nr_solicitacao','opus')??d['Nr Solicitação'],'Empresa':v(o,'empresa')??d.Empresa,
    'Descrição':v(o,'descricao_solicitacao','descricao','nome_obra')??d['Descrição Solicitação'],'% estimado':v(o,'percentual_estimado')??d['% estimado'],'% medido':v(o,'percentual_medido')??d['% medido'],
    'Início Obra':v(o,'inicio_os')??d['Início (OS)'],'Data Assinatura':v(o,'data_assinatura')??d['Data Assinatura'],'Fim Prazo':v(o,'fim_prazo')??d['Fim Prazo'],'Fim Vigência':v(o,'fim_vigencia')??d['Fim Vigência'],
    '% Quarta':v(o,'percentual_quarta')??d['% Quarta'],'Data quarta':v(o,'data_quarta')??d['Data quarta'],'% Antepenúltima':v(o,'percentual_antepenultima')??d['% Antepenúltima'],'Data Antepenúltima':v(o,'data_antepenultima')??d['Data Antepenúltima'],
    '% Penúltima':v(o,'percentual_penultima')??d['% Penúltima'],'Data Penúltima':v(o,'data_penultima')??d['Data Penúltima'],'% Última':v(o,'percentual_ultima')??d['% Última'],'Data Última':v(o,'data_ultima')??d['Data Última'],
    'Valor Inicial':v(o,'valor_inicial')??d['Valor Inicial'],'Valor Atual':v(o,'valor_atual')??d['Valor Atual'],'Total NE':v(o,'total_ne')??d['Total NE'],'Total Notas Fiscais':v(o,'total_notas_fiscais','total_nf')??d['Total Notas Fiscais'],
    'Falta Empenhar':v(o,'falta_empenhar')??d['Falta Empenhar'],'IDP':v(o,'idp')??d.IDP,'media mensal global':v(o,'media_mensal_global')??d['media mensal global'],'media medicao 3':v(o,'media_medicao_3')??d['media medicao 3'],
    'data projetada':v(o,'data_projetada')??d['data projetada'],'Ações Financeiras':v(o,'acoes_financeiras')??d['Ações Financeiras'],'Ação Orçamentaria':v(o,'acao_orcamentaria')??d['Ação Orçamentaria'],
    'obs':v(o,'obs')??d.obs,'analise':v(o,'analise')??d.analise,'Concepção do Objeto':d['Concepção do Objeto']||d['Concepção'],'Fundações':d['Fundações'],'Estrutura':d['Estrutura'],'Cobertura':d['Cobertura'],
    'Paredes Internas':d['Paredes Internas'],'Terraplenagem e Pavimentação':d['Terraplenagem e Pavimentação'],'PA':d.PA||o.pa,'Observações':d['OBSERVAÇÕES/PROBLEMAS TÉCNICOS-ORÇAMENTÁRIOS']||v(o,'obs')
  }}
  async function all(table){let out=[],from=0;for(;;){const {data,error}=await sb.from(table).select('*').range(from,from+999);if(error)throw error;out.push(...(data||[]));if(!data||data.length<1000)break;from+=1000}return out}
  function key(r){return String(r['Solicitação']||'')+'|'+String(r['Contrato']||'')}
  async function load(){
    const {data:{session}}=await sb.auth.getSession();if(!session){location.href='/';return}
    let obras=[];try{obras=await all('portfolio_obras')}catch(e){}if(!obras.length){try{obras=await all('obras_indicadores')}catch(e){obras=await all('obras')}}
    window.DATA=obras.map(map);window.PORT=[];window.OBRAS=window.DATA;
    let latest=[];try{latest=await all('fio_edicoes')}catch(e){}
    window.FIO_EDICOES={};latest.sort((a,b)=>(a.versao||0)-(b.versao||0)).forEach(x=>{if(x.html_snapshot){const r=window.OBRAS.find(z=>z.obra_id===x.obra_id||z.id===x.obra_id);if(r)window.FIO_EDICOES[key(r)]={html:x.html_snapshot,versao:x.versao}}});
    window.calcIDP=function(r){const salvo=toNum(r['IDP']);if(isNum(salvo))return salvo;const est=toNum(r['% estimado']),med=toNum(r['% medido']);return isNum(est)&&est!==0&&isNum(med)?med/est:null};
    window.salvarEdicaoFIO=async function(){const r=OBRAS[fioIndexAtual];if(!r)return;const clone=document.getElementById('fioSlide').cloneNode(true);clone.querySelectorAll('input').forEach(x=>x.remove());const html=clone.innerHTML;
      const atuais=latest.filter(x=>x.obra_id===(r.obra_id||r.id));const versao=Math.max(0,...atuais.map(x=>Number(x.versao)||0))+1;
      const payload={obra_id:r.obra_id||r.id,versao,criado_por:session.user.id,data_referencia:new Date().toISOString().slice(0,10),responsavel:session.user.email,percentual_fisico:toNum(r['% medido']),observacoes:r['obs']||'',html_snapshot:html,origem_dados:{nr_solicitacao:r['Solicitação'],nr_contrato:r['Contrato'],idp:calcIDP(r),formula_idp:'percentual_medido / percentual_estimado'}};
      const {error}=await sb.from('fio_edicoes').insert(payload);if(error){alert('Erro ao salvar versão da FIO: '+error.message);return}latest.push(payload);FIO_EDICOES[key(r)]={html,versao};alert('FIO salva no Supabase como versão '+versao+'.');};
    window.restaurarFIO=async function(){const r=OBRAS[fioIndexAtual];if(!r)return;delete FIO_EDICOES[key(r)];renderFioSlide(fioIndexAtual)};
    montarSelectFIO();aplicarQueryInicial();renderFioSlide(fioIndexAtual);try{await carregarGruposFIO()}catch(e){}
    const s=document.querySelector('.status');if(s)s.textContent='Dados e fórmulas carregados do Supabase';
  }
  document.addEventListener('DOMContentLoaded',()=>load().catch(e=>{console.error(e);alert('Não foi possível carregar a FIO do Supabase: '+e.message)}));
})();
