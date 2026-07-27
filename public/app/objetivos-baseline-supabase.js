(() => {
  const cfg=window.SIGOM_CONFIG||window.parent?.SIGOM_CONFIG;
  const sb=window.supabase?.createClient&&cfg?window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey):null;
  const get=(o,...ks)=>{for(const k of ks){if(o?.[k]!==null&&o?.[k]!==undefined&&o?.[k]!=='')return o[k]}return null};
  async function all(table){const out=[];let from=0;for(;;){const {data,error}=await sb.from(table).select('*').range(from,from+999);if(error)throw new Error(`${table}: ${error.message}`);out.push(...(data||[]));if(!data||data.length<1000)break;from+=1000}return out}
  async function optional(t){try{return await all(t)}catch(e){console.warn(e);return[]}}
  function digitsKey(v){return String(v??'').replace(/\D/g,'').replace(/^0+(?=\d)/,'')}
  function contractKey(v){return String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'').replace(/^n[º°o.]*/,'')}
  function key(o){return digitsKey(get(o,'nr_solicitacao','opus')||o?.dados_origem?.['Nr Solicitação']||o?.dados?.['Nr Solicitação'])+'|'+contractKey(get(o,'nr_contrato','contrato')||o?.dados_origem?.['Nr Contrato']||o?.dados?.['Nr Contrato'])}
  function merge(base,port){const m=new Map();base.forEach(o=>m.set(key(o),{...o,_obra_id:o.id}));port.forEach(p=>{const k=key(p),b=m.get(k)||{};m.set(k,{...b,...p,id:b._obra_id||b.id||p.id,_obra_id:b._obra_id||b.id||null,dados_origem:{...(b.dados_origem||b.dados||{}),...(p.dados_origem||p.dados||{})}})});return [...m.values()]}
  function row(o){const d=o.dados_origem||o.dados||{};return {
    'RM':get(o,'rm')??d.RM,'Contratante':get(o,'contratante')??d.Contratante,'OM Beneficiada':get(o,'om_beneficiada')??d['OM Beneficiada'],
    'Nr Contrato':get(o,'nr_contrato','contrato')??d['Nr Contrato'],'Nr Solicitação':get(o,'nr_solicitacao','opus')??d['Nr Solicitação'],'Empresa':get(o,'empresa')??d.Empresa,
    'Descrição Solicitação':get(o,'descricao_solicitacao','descricao','nome_obra')??d['Descrição Solicitação'],'% estimado':get(o,'percentual_estimado')??d['% estimado'],'% medido':get(o,'percentual_medido')??d['% medido'],
    'Valor Atual':get(o,'valor_atual')??d['Valor Atual'],'Valor Inicial':get(o,'valor_inicial')??d['Valor Inicial'],'Total NE':get(o,'total_ne')??d['Total NE'],'Total Notas Fiscais':get(o,'total_notas_fiscais','total_nf')??d['Total Notas Fiscais'],
    '% Empenhado':get(o,'percentual_empenhado')??d['% Empenhado'],'Falta Empenhar':get(o,'falta_empenhar')??d['Falta Empenhar'],'IDP':get(o,'idp')??d.IDP,
    'Início (OS)':get(o,'inicio_os')??d['Início (OS)'],'Fim Prazo':get(o,'fim_prazo')??d['Fim Prazo'],'Fim Vigência':get(o,'fim_vigencia')??d['Fim Vigência'],
    '% Quarta':get(o,'percentual_quarta')??d['% Quarta'],'% Antepenúltima':get(o,'percentual_antepenultima')??d['% Antepenúltima'],'% Penúltima':get(o,'percentual_penultima')??d['% Penúltima'],'% Última':get(o,'percentual_ultima')??d['% Última'],
    'Data Última':get(o,'data_ultima')??d['Data Última'],'data projetada':get(o,'data_projetada')??d['data projetada'],'dias atrasados':get(o,'dias_atrasados')??d['dias atrasados'],'analise':get(o,'analise')??d.analise,'Observações':get(o,'obs')??d.Observações??d.obs
  }}
  function setOnlineLogos(){[['logoL','/assets/logos/dom.png'],['logoM','/assets/logos/sigom.png'],['logoR','/assets/logos/dec.png']].forEach(([id,src])=>{const e=document.getElementById(id);if(e){e.innerHTML=`<img src="${src}" alt="${id}">`;e.classList.add('filled');e.onclick=null;e.style.cursor='default'}})}
  async function load(){if(!sb)throw new Error('Supabase não configurado.');const {data:{session}}=await sb.auth.getSession();if(!session){window.parent.location.href='/';return}
    const [{data:profile},obras,portfolio]=await Promise.all([sb.from('profiles').select('nome,perfil,ativo').eq('id',session.user.id).maybeSingle(),optional('obras_indicadores').then(async x=>x.length?x:optional('obras')),optional('portfolio_obras')]);
    if(profile?.ativo===false)throw new Error('Usuário inativo.');
    window.autoCarregar=async()=>{const rows=merge(obras,portfolio).map(row);setDB(rows,'Supabase · Planilha de Obras importada'+(portfolio.length?' + complementos do Portfólio':''));setOnlineLogos()};
    window.logoutOBJ=async()=>{await sb.auth.signOut();window.parent.location.href='/'};
    doLogin({login:session.user.email,nome:profile?.nome||session.user.email,perfil:profile?.perfil||'consulta'});setOnlineLogos();
    const fi=document.getElementById('fonteInfo');if(fi&&!obras.length)fi.textContent='Supabase sem registros na tabela de obras. Importe a Planilha de Obras pela Administração.';
  }
  window.SIGOM_CARREGAR_OBJETIVOS_ONLINE=()=>load().catch(e=>{console.error(e);document.body.classList.add('auth-ok');const fi=document.getElementById('fonteInfo');if(fi)fi.textContent='Erro ao carregar dados online: '+e.message});
  if(document.readyState!=='loading')setTimeout(window.SIGOM_CARREGAR_OBJETIVOS_ONLINE,0);
})();
