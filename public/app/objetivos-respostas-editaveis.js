(() => {
  const cfg=window.SIGOM_CONFIG||window.parent?.SIGOM_CONFIG;
  const sb=window.supabase?.createClient&&cfg?window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey):null;
  let session=null,profile=null,RESP=new Map();

  const OBJ1_FIELDS=[
    ['situacao_atual','Situação atual da obra'],
    ['andamento_atual','Andamento Atual da Obra'],
    ['previsao_conclusao','Previsão de Conclusão Atualizada'],
    ['motivos','Motivos que impediram o cumprimento da meta'],
    ['providencias','Providências Adotadas'],
    ['confirmacao_conclusao','Confirmação de conclusão'],
    ['nova_data_previsao','Nova data de previsão de conclusão']
  ];
  const OBJ5_FIELDS=[
    ['situacao_contrato_anterior','Situação contrato anterior'],
    ['estagio_projeto_remanescente','Estágio atual do projeto do remanescente'],
    ['situacao_licitacao_remanescente','Situação da licitação do remanescente'],
    ['pendencias','Pendências'],
    ['previsao_publicacao_edital','Previsão de publicação do edital'],
    ['previsao_reinicio_obra','Previsão de reinício da obra'],
    ['outras_observacoes','Outras observações']
  ];

  const esc3=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const digits3=v=>String(v??'').replace(/\D/g,'');
  const perfilEdita=()=>['administrador','editor'].includes(String(profile?.perfil||'').toLowerCase());
  const key=(obj,opus,contrato)=>obj+'|2026|'+String(opus||'')+'|'+String(contrato||'');

  async function load(){
    if(!sb)return;
    session=(await sb.auth.getSession()).data.session;
    if(!session)return;
    const {data:p}=await sb.from('profiles').select('nome,perfil,ativo').eq('id',session.user.id).maybeSingle();
    profile=p||{nome:session.user.email,perfil:'consulta'};
    const {data,error}=await sb.from('objetivos_respostas').select('*').in('codigo_objetivo',['OBJ1','OBJ5']).eq('exercicio',2026);
    if(error)throw error;
    RESP=new Map((data||[]).map(r=>[r.chave||key(r.codigo_objetivo,r.opus,r.contrato),r]));
    install();
  }

  function inputCell(obj,opus,contrato,field,value){
    const ro=perfilEdita()?'':'readonly';
    return '<textarea '+ro+' data-obj="'+obj+'" data-opus="'+esc3(opus)+'" data-contrato="'+esc3(contrato||'')+'" data-field="'+field+'">'+esc3(value||'')+'</textarea>';
  }

  function rowBase(o){
    return {
      opus:String(o.opus||o['Solicitação']||''),
      contrato:String(o.contrato||o['Contrato']||''),
      rm:String(o.rm||o['RM']||''),
      contratante:String(o.contratante||o.om||o['Contratante / CRO']||''),
      descricao:String(o.desc||o.nome||o['Descrição da Obra']||''),
      pmed:o.pmed??o['% Medido']??''
    };
  }

  function responseFor(obj,b){
    return RESP.get(key(obj,b.opus,b.contrato))||{campos:{}};
  }

  function renderObj1Editable(){
    const holder=document.getElementById('o1tab'); if(!holder)return;
    const all=typeof enrich==='function'?enrich(OBRAS17):OBRAS17;
    const sit=document.getElementById('o1sit')?.value||'';
    const q=(document.getElementById('o1q')?.value||'').toLowerCase();
    const list=all.filter(o=>(!sit||situacaoFinal(o).k===sit)&&(!q||[o.opus,o.desc,o.empresa,o.contrato,o.om,o.rm].join(' ').toLowerCase().includes(q)));
    const head=['Objetivo','Nº OPUS','Contrato','RM','Contratante / CRO','Descrição da Obra','% Medido',...OBJ1_FIELDS.map(x=>x[1]),'Ações'];
    const rows=list.map(o=>{const b=rowBase(o),r=responseFor('OBJ1',b),c=r.campos||{};return '<tr>'
      +'<td>OBJ1</td><td class="base-cell">'+esc3(b.opus)+'</td><td>'+esc3(b.contrato)+'</td><td>'+esc3(b.rm)+'</td>'
      +'<td class="desc-cell">'+esc3(b.contratante)+'</td><td class="desc-cell">'+esc3(b.descricao)+'</td><td>'+esc3(typeof pct==='function'?pct(b.pmed):b.pmed)+'</td>'
      +OBJ1_FIELDS.map(([f])=>'<td>'+inputCell('OBJ1',b.opus,b.contrato,f,c[f])+'</td>').join('')
      +'<td class="obj-row-actions"><button class="btn blue" onclick="salvarRespostaObjetivoLinha(\'OBJ1\',\''+esc3(b.opus)+'\',\''+esc3(b.contrato)+'\')">💾 Salvar</button>'
      +'<button class="btn" onclick="historicoRespostaObjetivo(\'OBJ1\',\''+esc3(b.opus)+'\',\''+esc3(b.contrato)+'\')">🕘</button>'
      +'<div class="obj-save-state" id="state_OBJ1_'+digits3(b.opus)+'"></div></td></tr>'}).join('');
    holder.innerHTML='<div class="obj-edit-toolbar"><button class="btn blue" onclick="salvarTodasRespostasObjetivo(\'OBJ1\')">💾 Salvar todas</button><button class="btn" onclick="exportarRespostasObjetivoExcel(\'OBJ1\')">📊 Exportar Excel no modelo</button><span class="note">As respostas ficam salvas no Supabase.</span></div>'
      +'<div class="tblbox"><table class="obj-edit-table"><thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
  }

  function obj5Rows(){
    const base=(typeof enrichObj5==='function'?enrichObj5(PARALISADAS.map(p=>({...p,opus:p.opus||'',objetivoAudit:'OBJ5'}))):PARALISADAS);
    const extras=[...RESP.values()].filter(r=>r.codigo_objetivo==='OBJ5'&&!base.some(o=>digits3(o.opus)===digits3(r.opus)&&String(o.contratoObj5||o.contrato||'')===String(r.contrato||'')))
      .map(r=>({opus:r.opus,contratoObj5:r.contrato,rm:r.rm,contratante:r.contratante,nome:r.descricao_obra,desc:r.descricao_obra,_match:false,_orig:{}}));
    return [...base,...extras];
  }

  function renderObj5Editable(){
    const holder=document.getElementById('obj5'); if(!holder)return;
    const list=obj5Rows();
    const head=['Objetivo','Nº OPUS','Contrato','RM','Contratante / CRO','Descrição da Obra',...OBJ5_FIELDS.map(x=>x[1]),'Ações'];
    const rows=list.map(o=>{const b=rowBase({...o,contrato:o.contratoObj5||o.contrato,descricao:o.nome||o.desc}),r=responseFor('OBJ5',b),c=r.campos||{};return '<tr>'
      +'<td>OBJ5</td><td class="base-cell">'+esc3(b.opus)+'</td><td>'+esc3(b.contrato)+'</td><td>'+esc3(b.rm)+'</td>'
      +'<td class="desc-cell">'+esc3(b.contratante)+'</td><td class="desc-cell">'+esc3(b.descricao)+'</td>'
      +OBJ5_FIELDS.map(([f])=>'<td>'+inputCell('OBJ5',b.opus,b.contrato,f,c[f])+'</td>').join('')
      +'<td class="obj-row-actions"><button class="btn blue" onclick="salvarRespostaObjetivoLinha(\'OBJ5\',\''+esc3(b.opus)+'\',\''+esc3(b.contrato)+'\')">💾 Salvar</button>'
      +'<button class="btn" onclick="historicoRespostaObjetivo(\'OBJ5\',\''+esc3(b.opus)+'\',\''+esc3(b.contrato)+'\')">🕘</button>'
      +'<div class="obj-save-state" id="state_OBJ5_'+digits3(b.opus)+'"></div></td></tr>'}).join('');
    holder.innerHTML='<div class="card"><h2>Objetivo 05 — Obras Paralisadas / Recontratação</h2>'
      +'<div class="obj-edit-toolbar"><button class="btn blue" onclick="salvarTodasRespostasObjetivo(\'OBJ5\')">💾 Salvar todas</button><button class="btn" onclick="exportarRespostasObjetivoExcel(\'OBJ5\')">📊 Exportar Excel no modelo</button><span class="note">Campos editáveis e salvos no Supabase.</span></div>'
      +'<div class="tblbox"><table class="obj-edit-table"><thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
  }

  function collect(obj,opus,contrato){
    const fields=obj==='OBJ1'?OBJ1_FIELDS:OBJ5_FIELDS;
    const campos={};
    fields.forEach(([f])=>{const el=document.querySelector('[data-obj="'+obj+'"][data-opus="'+CSS.escape(String(opus))+'"][data-contrato="'+CSS.escape(String(contrato||''))+'"][data-field="'+f+'"]');campos[f]=el?.value?.trim()||''});
    const source=(obj==='OBJ1'?(typeof enrich==='function'?enrich(OBRAS17):OBRAS17):obj5Rows()).find(o=>digits3(o.opus)===digits3(opus)&&String(o.contratoObj5||o.contrato||'')===String(contrato||''))||{};
    const b=rowBase({...source,contrato:source.contratoObj5||source.contrato,descricao:source.nome||source.desc});
    return {b,campos};
  }

  window.salvarRespostaObjetivoLinha=async(obj,opus,contrato)=>{
    if(!perfilEdita())return alert('Apenas Administrador e Editor podem salvar respostas.');
    const {b,campos}=collect(obj,opus,contrato);
    const chave=key(obj,opus,contrato),old=RESP.get(chave)||null;
    const payload={chave,codigo_objetivo:obj,exercicio:2026,opus:String(opus),contrato:String(contrato||''),rm:b.rm||null,contratante:b.contratante||null,descricao_obra:b.descricao||null,percentual_medido:typeof num==='function'?num(b.pmed):null,campos,fonte:'SIGOM Objetivos e Metas',atualizado_por:session.user.id,atualizado_por_nome:profile?.nome||session.user.email,atualizado_em:new Date().toISOString()};
    const {data,error}=await sb.from('objetivos_respostas').upsert(payload,{onConflict:'chave'}).select().single();
    const st=document.getElementById('state_'+obj+'_'+digits3(opus));
    if(error){if(st){st.textContent='Erro: '+error.message;st.className='obj-save-state err'}return}
    RESP.set(chave,data);
    await sb.from('objetivos_respostas_historico').insert({resposta_id:data.id,codigo_objetivo:obj,exercicio:2026,opus:String(opus),contrato:String(contrato||''),antes:old,depois:data,registrado_por:session.user.id,registrado_por_nome:profile?.nome||session.user.email});
    if(st){st.textContent='Salvo em '+new Date().toLocaleTimeString('pt-BR');st.className='obj-save-state ok'}
  };

  window.salvarTodasRespostasObjetivo=async obj=>{
    const seen=new Set(),els=[...document.querySelectorAll('[data-obj="'+obj+'"][data-opus]')];
    for(const el of els){const k=el.dataset.opus+'|'+el.dataset.contrato;if(seen.has(k))continue;seen.add(k);await window.salvarRespostaObjetivoLinha(obj,el.dataset.opus,el.dataset.contrato)}
    alert('Respostas do '+obj+' salvas no Supabase.');
  };

  window.historicoRespostaObjetivo=async(obj,opus,contrato)=>{
    const {data,error}=await sb.from('objetivos_respostas_historico').select('*').eq('codigo_objetivo',obj).eq('opus',String(opus)).eq('contrato',String(contrato||'')).order('registrado_em',{ascending:false}).limit(100);
    if(error)return alert(error.message);
    let ov=document.getElementById('objRespHist');if(!ov){ov=document.createElement('div');ov.id='objRespHist';ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:6000;display:flex;align-items:center;justify-content:center;padding:18px';document.body.appendChild(ov)}
    const rows=(data||[]).map(x=>'<tr><td>'+new Date(x.registrado_em).toLocaleString('pt-BR')+'</td><td>'+esc3(x.registrado_por_nome||'')+'</td><td><pre style="white-space:pre-wrap">'+esc3(JSON.stringify(x.depois?.campos||{},null,2))+'</pre></td></tr>').join('');
    ov.innerHTML='<div style="background:#fff;border-radius:14px;width:min(1000px,96vw);max-height:88vh;overflow:auto;padding:18px"><div style="display:flex;justify-content:space-between"><b>Histórico — '+obj+' / '+esc3(opus)+'</b><button onclick="document.getElementById(\'objRespHist\').remove()">✕</button></div><table><thead><tr><th>Data</th><th>Usuário</th><th>Dados salvos</th></tr></thead><tbody>'+(rows||'<tr><td colspan="3">Sem histórico.</td></tr>')+'</tbody></table></div>';
  };

  window.exportarRespostasObjetivoExcel=obj=>{
    const fields=obj==='OBJ1'?OBJ1_FIELDS:OBJ5_FIELDS;
    const base=obj==='OBJ1'?(typeof enrich==='function'?enrich(OBRAS17):OBRAS17):obj5Rows();
    const headers=obj==='OBJ1'
      ?['Objetivo','Nº OPUS','Contrato','RM','Contratante / CRO','Descrição da Obra','% Medido',...fields.map(x=>x[1])]
      :['Objetivo','Nº OPUS','Contrato','RM','Contratante / CRO','Descrição da Obra',...fields.map(x=>x[1])];
    const rows=base.map(o=>{const b=rowBase({...o,contrato:o.contratoObj5||o.contrato,descricao:o.nome||o.desc}),r=responseFor(obj,b),c=r.campos||{};const fixed=[obj,b.opus,b.contrato,b.rm,b.contratante,b.descricao];if(obj==='OBJ1')fixed.push(typeof pctNum==='function'&&pctNum(b.pmed)!=null?pctNum(b.pmed)/100:'');return [...fixed,...fields.map(([f])=>c[f]||'')]});
    const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);
    ws['!cols']=headers.map((h,i)=>({wch:i===5?48:i>=6?32:16}));
    if(obj==='OBJ1')for(let r=2;r<=rows.length+1;r++){const cell=ws['G'+r];if(cell){cell.z='0.00%'}}
    ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:rows.length,c:headers.length-1}})};
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,obj==='OBJ1'?'Acompanhamento 1º Semestre':'Acompanhamento');
    XLSX.writeFile(wb,'SIGOM_'+obj+'_Respostas_'+new Date().toISOString().slice(0,10)+'.xlsx');
  };

  function install(){
    const old1=window.renderObj1Tab;
    window.renderObj1Tab=()=>{if(typeof old1==='function')old1();renderObj1Editable()};
    window.renderObj5=renderObj5Editable;
    renderObj1Editable();renderObj5Editable();
  }

  setTimeout(()=>load().catch(e=>console.error('Objetivos respostas editáveis:',e)),1500);
})();