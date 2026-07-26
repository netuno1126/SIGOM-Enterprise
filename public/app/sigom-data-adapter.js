(() => {
  const cfg = window.SIGOM_CONFIG || parent?.SIGOM_CONFIG;
  const sb = window.supabase?.createClient && cfg ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey) : null;
  const val=(o,...ks)=>{for(const k of ks){if(o?.[k]!==null&&o?.[k]!==undefined&&o?.[k]!=='')return o[k]}return null};
  const data=(v)=>v||null;
  function row(o){const d=o.dados_origem||o.dados||{};return {
    id:o.id, obra_id:o.obra_id||o.id,
    'RM':val(o,'rm')??d['RM'], 'Contratante':val(o,'contratante')??d['Contratante'],
    'OM Beneficiada':val(o,'om_beneficiada')??d['OM Beneficiada'],
    'Contrato':val(o,'nr_contrato','contrato')??d['Nr Contrato'],
    'Solicitação':val(o,'nr_solicitacao','opus')??d['Nr Solicitação'],
    'Empresa':val(o,'empresa')??d['Empresa'], 'Descrição':val(o,'descricao_solicitacao','descricao','nome_obra')??d['Descrição Solicitação'],
    'Nome da Obra':val(o,'nome_obra')??'', '% estimado':val(o,'percentual_estimado')??d['% estimado'], '% medido':val(o,'percentual_medido')??d['% medido'],
    'Valor Solicitação':val(o,'valor_solicitacao')??d['Valor Solicitação'], 'Valor Contratado':val(o,'valor_contratado')??d['Valor Contratado'],
    'Ações Financeiras':val(o,'acoes_financeiras')??d['Ações Financeiras'], 'Ação Orçamentaria':val(o,'acao_orcamentaria')??d['Ação Orçamentaria'],
    'Início Obra':data(val(o,'inicio_os'))??d['Início (OS)'], 'Data Assinatura':data(val(o,'data_assinatura'))??d['Data Assinatura'],
    'Fim Prazo':data(val(o,'fim_prazo'))??d['Fim Prazo'], 'Fim Vigência':data(val(o,'fim_vigencia'))??d['Fim Vigência'],
    '% Quarta':val(o,'percentual_quarta')??d['% Quarta'], 'Data quarta':data(val(o,'data_quarta'))??d['Data quarta'],
    '% Antepenúltima':val(o,'percentual_antepenultima')??d['% Antepenúltima'], 'Data Antepenúltima':data(val(o,'data_antepenultima'))??d['Data Antepenúltima'],
    '% Penúltima':val(o,'percentual_penultima')??d['% Penúltima'], 'Data Penúltima':data(val(o,'data_penultima'))??d['Data Penúltima'],
    '% Última':val(o,'percentual_ultima')??d['% Última'], 'Data Última':data(val(o,'data_ultima'))??d['Data Última'],
    'Valor Inicial':val(o,'valor_inicial')??d['Valor Inicial'], 'Valor Aditivado':val(o,'valor_aditivado')??d['Valor Aditivado'],
    'Valor Apostilado':val(o,'valor_apostilado')??d['Valor Apostilado'], 'Valor Atual':val(o,'valor_atual')??d['Valor Atual'],
    'Total NC':val(o,'total_nc')??d['Total NC'], 'Total NE':val(o,'total_ne')??d['Total NE'],
    '% Empenhado':val(o,'percentual_empenhado')??d['% Empenhado'], 'Falta Empenhar':val(o,'falta_empenhar')??d['Falta Empenhar'],
    'Total Notas Fiscais':val(o,'total_notas_fiscais','total_nf')??d['Total Notas Fiscais'],
    'Prazo Contratado':val(o,'prazo_contratado')??d['Prazo Contratado'], 'Prazo Aditivo':val(o,'prazo_aditivo')??d['Prazo Aditivo'], 'Prazo Total':val(o,'prazo_total')??d['Prazo Total'],
    'Vigência Contratado':val(o,'vigencia_contratado')??d['Vigência Contratado'], 'Vigência Aditivado':val(o,'vigencia_aditivado')??d['Vigência Aditivado'], 'Vigência Total':val(o,'vigencia_total')??d['Vigência Total'],
    'Término de Vigência':data(val(o,'termino_vigencia'))??d['Término de Vigência'], 'Saldo a Descentralizar':val(o,'saldo_descentralizar')??d['Saldo a Descentralizar'],
    'IDP':val(o,'idp')??d['IDP'], 'data projetada':data(val(o,'data_projetada'))??d['data projetada'], 'obs':val(o,'obs')??d['obs'],
    'dias atrasados':val(o,'dias_atrasados')??d['dias atrasados'], '% atraso':val(o,'percentual_atraso')??d['% atraso'],
    'media medicao 3':val(o,'media_medicao_3')??d['media medicao 3'], 'media mensal global':val(o,'media_mensal_global')??d['media mensal global'],
    'analise':val(o,'analise')??d['analise'], 'media 90 dias':val(o,'media_90_dias')??d['media 90 dias'], 'saldo de empenho':val(o,'saldo_empenho')??d['saldo de empenho'],
    'Concepção do Objeto':d['Concepção do Objeto']||d['Concepção'], 'Fundações':d['Fundações'], 'Estrutura':d['Estrutura'], 'Cobertura':d['Cobertura'],
    'Paredes Internas':d['Paredes Internas'], 'Terraplenagem e Pavimentação':d['Terraplenagem e Pavimentação'], 'PA':d['PA']||o.pa, 'Observações':val(o,'obs')??d['OBSERVAÇÕES/PROBLEMAS TÉCNICOS-ORÇAMENTÁRIOS']
  }}
  async function all(table, select='*'){let out=[],from=0;for(;;){const {data,error}=await sb.from(table).select(select).range(from,from+999);if(error)throw error;out.push(...(data||[]));if(!data||data.length<1000)break;from+=1000}return out}
  async function load(){
    if(!sb) throw new Error('Configuração Supabase indisponível.');
    const {data:{session}}=await sb.auth.getSession(); if(!session){location.href='/';return}
    let obras=[]; try{obras=await all('obras_indicadores')}catch(e){obras=await all('obras')}
    let portfolio=[]; try{portfolio=await all('portfolio_obras')}catch(e){}
    let principais=[]; try{principais=await all('principais_obras')}catch(e){}
    let saldos=[]; try{saldos=await all('saldos_alongados_consolidado')}catch(e){}
    const names={}; principais.forEach(p=>{if(p.nr_solicitacao)names[String(p.nr_solicitacao).replace(/\D/g,'')]=p.descricao});
    window.NOME_OBRA_MAP=names; window.DATA=obras.map(row); window.PORT=portfolio.map(row);
    window.DATA.forEach(r=>{const n=names[String(r['Solicitação']||'').replace(/\D/g,'')];if(n)r['Nome da Obra']=n});
    window.PORT.forEach(r=>{const n=names[String(r['Solicitação']||'').replace(/\D/g,'')];if(n)r['Nome da Obra']=n});
    window.SALDOS=saldos.map(s=>{const o={OM:s.om};for(let y=2016;y<=2026;y++)o[String(y)]=s['saldo_'+y];o.total=s.total;return o});
    window.__sigomLoaded=true; document.body.classList.add('auth-ok');
    try{document.getElementById('loginScreen')?.remove()}catch(e){}
    document.getElementById('dropMsg')?.classList.add('hidden'); document.getElementById('app')?.classList.remove('hidden');
    const st=document.getElementById('status'); if(st)st.textContent='✔ '+window.DATA.length+' obras carregadas do Supabase';
    const lu=document.getElementById('lastUpdate');if(lu)lu.textContent='dados online · '+new Date().toLocaleString('pt-BR');
    try{initFilters();preencherSelectGrupos();render();initObraSelect();renderAnalise();renderMediaMensalGlobal();renderPlanilha();}catch(e){console.error(e)}
    try{renderGeneric('tblPort',window.PORT);applyPort()}catch(e){}
    try{document.getElementById('saldoInfo').textContent='— '+window.SALDOS.length+' OM(s) · Supabase';renderSaldos()}catch(e){}
  }
  window.logoutSIGOM=async()=>{try{await sb.auth.signOut()}finally{location.href='/'}};
  window.abrirFIOExterno=()=>{window.open('/app/fio.html','_blank')};
  window.abrirFIOGrupoSelecionado=()=>{const g=document.getElementById('fGrupo')?.value||'';window.open('/app/fio.html?grupo='+encodeURIComponent(g),'_blank')};
  document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('.filters input,.filters select,.tblFilterRow input').forEach(el=>{const paint=()=>el.classList.toggle('sigom-filtro-ativo',!!String(el.value||'').trim());el.addEventListener('input',paint);el.addEventListener('change',paint)});load().catch(e=>{console.error(e);const st=document.getElementById('status');if(st)st.textContent='Erro ao carregar Supabase: '+e.message})});
})();
