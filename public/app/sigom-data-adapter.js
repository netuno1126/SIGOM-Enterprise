(() => {
  // Evita que o Dashboard conclua prematuramente que o Portfólio está vazio.
  window.__sigomLoaded=false;
  const cfg = window.SIGOM_CONFIG || window.parent?.SIGOM_CONFIG;
  const sb = window.supabase?.createClient && cfg
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey)
    : null;

  const val=(o,...ks)=>{for(const k of ks){if(o?.[k]!==null&&o?.[k]!==undefined&&o?.[k]!=='')return o[k]}return null};
  const data=v=>v||null;
  function row(o){
    const d=o.dados_origem||o.dados||{};
    return {
      id:o.id, obra_id:o.obra_id||o.id,
      'RM':val(o,'rm')??d['RM'], 'Contratante':val(o,'contratante')??d['Contratante'],
      'OM Beneficiada':val(o,'om_beneficiada')??d['OM Beneficiada'],
      'Contrato':val(o,'nr_contrato','contrato')??d['Nr Contrato']??d['Contrato'],
      'Solicitação':val(o,'nr_solicitacao','opus')??d['Nr Solicitação']??d['Nº OPUS'],
      'Empresa':val(o,'empresa')??d['Empresa'],
      'Descrição':val(o,'descricao_solicitacao','descricao','nome_obra')??d['Descrição Solicitação']??d['Descrição'],
      'Nome da Obra':val(o,'nome_obra')??d['Nome da Obra']??'',
      '% estimado':val(o,'percentual_estimado')??d['% estimado'], '% medido':val(o,'percentual_medido')??d['% medido'],
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
      'Paredes Internas':d['Paredes Internas'], 'Terraplenagem e Pavimentação':d['Terraplenagem e Pavimentação'], 'PA':d['PA']||o.pa,
      'Observações':val(o,'obs')??d['OBSERVAÇÕES/PROBLEMAS TÉCNICOS-ORÇAMENTÁRIOS']
    };
  }

  async function all(table,select='*'){
    const out=[];let from=0;
    for(;;){
      const {data,error}=await sb.from(table).select(select).range(from,from+999);
      if(error)throw new Error(`${table}: ${error.message}`);
      out.push(...(data||[]));
      if(!data||data.length<1000)break;
      from+=1000;
    }
    return out;
  }
  async function optional(table){try{return {rows:await all(table),error:null}}catch(error){console.warn(error);return {rows:[],error}}}


  const normText=v=>String(v??'').trim();
  const normContrato=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,'').replace(/^n[º°o.]*/i,'');
  const normOpus=v=>String(v??'').replace(/\D/g,'');
  function parseObraRef(item){
    if(item&&typeof item==='object')return {opus:normOpus(item.opus||item.nr_opus||item['Nr OPUS']||item['Nr Solicitação']),contrato:normText(item.contrato||item['Nr Contrato'])};
    const raw=normText(item);const pos=raw.indexOf('|');
    return pos>=0?{opus:normOpus(raw.slice(0,pos)),contrato:normText(raw.slice(pos+1))}:{opus:normOpus(raw),contrato:''};
  }
  async function loadGroupsFromDb(){
    const [gr,ln]=await Promise.all([optional('grupos'),optional('grupo_obras')]);
    const obraMap=new Map();
    [...(window.SIGOM_OBTER_OBRAS_ATUAIS?.()||[])].forEach(o=>{if(o.id||o.obra_id)obraMap.set(String(o.id||o.obra_id),o)});
    const byId=new Map(gr.rows.map(g=>[String(g.id),{nome:g.nome,descricao:g.descricao||'',criadoEm:g.criado_em||'',criadoPor:g.criado_por||'',criador:g.criador||'',obras:[],subgrupos:{},arquivado:!!g.arquivado,arquivadoEm:g.arquivado_em||''}]));
    for(const l of ln.rows){
      const g=byId.get(String(l.grupo_id)),o=obraMap.get(String(l.obra_id));if(!g||!o)continue;
      const op=normText(o['Solicitação']||o.nr_solicitacao||o.opus),ct=normText(o.Contrato||o.nr_contrato||o.contrato);
      if(op)g.obras.push(op+'|'+ct);
    }
    const payload={config:{permitirAuditorExcluir:false,permitirUsuarioCriarGrupo:true},usuario:'',perfil:'',atualizadoEm:new Date().toISOString(),grupos:[...byId.values()]};
    window.SIGOM_APLICAR_GRUPOS_ONLINE?.(payload);return payload;
  }
  async function saveGroupsToDb(payload){
    const {data:{session}}=await sb.auth.getSession();if(!session)throw new Error('Sessão expirada.');
    const groups=Array.isArray(payload?.grupos)?payload.grupos:[];
    const base=window.SIGOM_OBTER_OBRAS_ATUAIS?.()||[];
    const obraByKey=new Map();
    base.forEach(o=>{const op=normOpus(o['Solicitação']||o.nr_solicitacao||o.opus),ct=normContrato(o.Contrato||o.nr_contrato||o.contrato);if(op){obraByKey.set(op+'|'+ct,o);if(!obraByKey.has(op+'|'))obraByKey.set(op+'|',o)}});
    let gravados=0,vinculos=0,naoEncontradas=[];
    for(const g0 of groups){
      const nome=normText(g0.nome);if(!nome||['config','grupos'].includes(nome.toLowerCase()))continue;
      let {data:g,error:ge}=await sb.from('grupos').select('id').eq('nome',nome).maybeSingle();
      if(ge)throw ge;
      const body={nome,descricao:normText(g0.descricao),arquivado:!!g0.arquivado,atualizado_por:session.user.id};
      if(!g){const r=await sb.from('grupos').insert({...body,criado_por:session.user.id}).select('id').single();if(r.error)throw r.error;g=r.data}else{const r=await sb.from('grupos').update(body).eq('id',g.id);if(r.error)throw r.error}
      gravados++;
      const wanted=[];
      for(const item of (g0.obras||[])){const ref=parseObraRef(item);let o=obraByKey.get(ref.opus+'|'+normContrato(ref.contrato))||obraByKey.get(ref.opus+'|');if(!o){naoEncontradas.push(`${nome}: ${ref.opus}|${ref.contrato}`);continue}wanted.push(String(o.id||o.obra_id))}
      const ex=await sb.from('grupo_obras').select('obra_id').eq('grupo_id',g.id);if(ex.error)throw ex.error;
      const existing=new Set((ex.data||[]).map(x=>String(x.obra_id))),target=new Set(wanted);
      const add=[...target].filter(id=>!existing.has(id)).map(id=>({grupo_id:g.id,obra_id:id,adicionado_por:session.user.id}));
      if(add.length){const r=await sb.from('grupo_obras').upsert(add,{onConflict:'grupo_id,obra_id'});if(r.error)throw r.error;vinculos+=add.length}
      const del=[...existing].filter(id=>!target.has(id));
      if(del.length){const r=await sb.from('grupo_obras').delete().eq('grupo_id',g.id).in('obra_id',del);if(r.error)console.warn('Não foi possível remover vínculos antigos:',r.error.message)}
    }
    await loadGroupsFromDb();
    return {grupos:gravados,vinculos,naoEncontradas};
  }
  window.SIGOM_CARREGAR_GRUPOS_SUPABASE=async()=>{try{await loadGroupsFromDb();return true}catch(e){console.warn(e);return false}};
  window.SIGOM_SALVAR_GRUPOS_SUPABASE=async payload=>{try{const r=await saveGroupsToDb(payload);alert(`Grupos salvos no Supabase.\nGrupos: ${r.grupos}\nNovos vínculos: ${r.vinculos}\nNão localizadas: ${r.naoEncontradas.length}`);return true}catch(e){alert('Erro ao salvar grupos: '+e.message);return false}};
  window.selecionarArquivoImportarGrupos=()=>document.getElementById('grupoImportInput')?.click();
  window.importarGruposJSONArquivo=async file=>{if(!file)return;try{const payload=JSON.parse(await file.text());const normalized=Array.isArray(payload)?{grupos:payload}:payload;const r=await saveGroupsToDb(normalized);alert(`Importação concluída.\nGrupos: ${r.grupos}\nVínculos: ${r.vinculos}\nNão localizadas: ${r.naoEncontradas.length}`)}catch(e){alert('Falha na importação: '+e.message)}};
  window.exportarGruposJSON=async()=>{try{const payload=await loadGroupsFromDb();const {data:{session}}=await sb.auth.getSession();payload.usuario=session?.user?.email||'';payload.perfil='';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}));a.download='grupos_obras.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}catch(e){alert('Falha ao exportar grupos: '+e.message)}};
  window.salvarGruposNavegadorNoArquivo=()=>window.SIGOM_SALVAR_GRUPOS_SUPABASE(window.SIGOM_OBTER_GRUPOS_ATUAIS?.()||{grupos:[]});

  function slugKey(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')}
  function parsePrincipaisWorkbook(file){
    return file.arrayBuffer().then(buf=>{
      const wb=XLSX.read(buf,{type:'array',cellDates:true});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const grid=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false,dateNF:'dd/mm/yyyy'});
      const out=[];let categoria='';let ordem=0;let rmAtual='';
      for(const row of grid){
        const a=String(row[0]??'').trim(),b=String(row[1]??'').trim(),c=String(row[2]??'').trim();
        const ac=a.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
        if(ac==='OBRAS EM ANDAMENTO'||ac==='FUTURAS OBRAS'){categoria=ac;ordem=0;rmAtual='';continue}
        if(!categoria||ac==='NR SOLICITACAO'||(!a&&!b&&!c))continue;
        if(c)rmAtual=c;
        const nr=String(a).replace(/\D/g,'');
        if(!nr||!b)continue;
        ordem++;
        out.push({
          chave:[categoria,nr,rmAtual].join('|'),categoria,nr_solicitacao:nr,
          descricao:b,rm:rmAtual||null,ordem,
          dados_origem:{'Nr Solicitação':nr,'Descrição':b,'RM':rmAtual}
        });
      }
      return out;
    });
  }
  window.selecionarArquivoPrincipaisObras=()=>document.getElementById('principaisImportInput')?.click();
  window.importarPrincipaisObrasArquivo=async file=>{
    if(!file)return;
    try{
      const rows=await parsePrincipaisWorkbook(file);
      if(!rows.length)throw new Error('Nenhum Nº OPUS e nome de obra foi encontrado na planilha.');
      const {data:{session}}=await sb.auth.getSession();if(!session)throw new Error('Sessão expirada.');
      let ok=0;
      for(let i=0;i<rows.length;i+=100){
        const chunk=rows.slice(i,i+100).map(r=>({...r,atualizado_por:session.user.id,atualizado_em:new Date().toISOString()}));
        const {error}=await sb.from('principais_obras').upsert(chunk,{onConflict:'chave'});
        if(error)throw error;ok+=chunk.length;
      }
      alert(`Nome Principais Obras importado com sucesso.\nRegistros: ${ok}`);
      await load();
    }catch(e){alert('Falha na importação de Nome Principais Obras: '+e.message)}
  };

  async function load(){
    if(!sb)throw new Error('Configuração do Supabase indisponível.');
    const {data:{session},error:sessionError}=await sb.auth.getSession();
    if(sessionError)throw sessionError;
    if(!session){window.parent.location.href='/';return}

    // Sincroniza a identidade Supabase com a sessão usada pelo Dashboard baseline.
    // Sem esta ponte, o menu legado não reconhece o perfil e oculta as ações administrativas.
    const {data:profile,error:profileError}=await sb.from('profiles')
      .select('nome,username,perfil,ativo')
      .eq('id',session.user.id)
      .maybeSingle();
    if(profileError)console.warn('Perfil SIGOM:',profileError.message);
    if(profile?.ativo===false){await sb.auth.signOut();window.parent.location.href='/';return}
    const perfilNormalizado=String(profile?.perfil||'consulta').trim().toLowerCase();
    const authInfo={
      id:session.user.id,
      email:session.user.email,
      login:profile?.username||session.user.email,
      username:profile?.username||'',
      nome:profile?.nome||profile?.username||session.user.email,
      perfil:perfilNormalizado
    };
    sessionStorage.setItem('sigom_auth_user',JSON.stringify(authInfo));
    try{localStorage.setItem('sigom_auth_user',JSON.stringify(authInfo))}catch(_e){}
    if(typeof window.aplicarPerfilVisual==='function')window.aplicarPerfilVisual();

    let source='obras_indicadores';
    let obrasResult=await optional('obras_indicadores');
    if(obrasResult.error||!obrasResult.rows.length){source='obras';obrasResult=await optional('obras')}
    const [portfolioResult,principaisResult,saldosResult]=await Promise.all([
      optional('portfolio_obras'), optional('principais_obras'), optional('saldos_alongados_consolidado')
    ]);

    let obras=obrasResult.rows;
    const portfolio=portfolioResult.rows;
    // Contingência operacional: o Portfólio possui a mesma estrutura de 51 campos.
    if(!obras.length&&portfolio.length){obras=[...portfolio];source='portfolio_obras (contingência)'}

    const names={};
    principaisResult.rows.forEach(p=>{if(p.nr_solicitacao)names[String(p.nr_solicitacao).replace(/\D/g,'')]=p.descricao});
    const dataRows=obras.map(row), portRows=portfolio.map(row);
    for(const r of [...dataRows,...portRows]){const n=names[String(r['Solicitação']||'').replace(/\D/g,'')];if(n)r['Nome da Obra']=n}
    const saldos=saldosResult.rows.map(s=>{const o={OM:s.om};for(let y=2016;y<=2026;y++)o[String(y)]=s['saldo_'+y];o.total=s.total;return o});

    if(typeof window.SIGOM_APLICAR_DADOS_ONLINE!=='function')throw new Error('Ponte de dados do Dashboard não encontrada.');
    window.SIGOM_APLICAR_DADOS_ONLINE({data:dataRows,portfolio:portRows,saldos,nomes:names,fonte:source});
    window.__sigomLoaded=true;
    await loadGroupsFromDb().catch(e=>console.warn("Grupos:",e));

    if(!dataRows.length){
      const errs=[obrasResult.error,portfolioResult.error].filter(Boolean).map(e=>e.message).join(' | ');
      const st=document.getElementById('status');
      if(st)st.textContent='⚠ Supabase respondeu sem obras.'+(errs?' '+errs:' Verifique a importação e a migration 14.');
    }else if(portfolioResult.error){
      const st=document.getElementById('status');
      if(st)st.textContent='⚠ Obras carregadas, mas o Portfólio não pôde ser consultado: '+portfolioResult.error.message;
    }
  }

  window.logoutSIGOM=async()=>{try{await sb.auth.signOut()}finally{window.parent.location.href='/'}};
  window.abrirFIOExterno=()=>window.open('/app/fio.html','_blank');
  window.abrirFIOGrupoSelecionado=()=>{const g=document.getElementById('fGrupo')?.value||'';window.open('/app/fio.html?grupo='+encodeURIComponent(g),'_blank')};
  document.addEventListener('DOMContentLoaded',()=>{
    const gi=document.getElementById('grupoImportInput');if(gi)gi.addEventListener('change',async e=>{const f=e.target.files?.[0];e.target.value='';await window.importarGruposJSONArquivo(f)});
    const pi=document.getElementById('principaisImportInput');if(pi)pi.addEventListener('change',async e=>{const f=e.target.files?.[0];e.target.value='';await window.importarPrincipaisObrasArquivo(f)});
    document.querySelectorAll('.filters input,.filters select,.tblFilterRow input').forEach(el=>{
      const paint=()=>el.classList.toggle('sigom-filtro-ativo',!!String(el.value||'').trim());
      el.addEventListener('input',paint);el.addEventListener('change',paint);
    });
    load().catch(e=>{console.error(e);const st=document.getElementById('status');if(st)st.textContent='Erro ao carregar Supabase: '+e.message});
  });
})();
