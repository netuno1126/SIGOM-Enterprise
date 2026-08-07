(() => {
  const cfg = window.SIGOM_CONFIG || window.parent?.SIGOM_CONFIG;
  const sb = window.supabase?.createClient && cfg
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey)
    : null;

  let session = null;
  let profile = null;
  let respostas = [];
  let auditorias = [];
  let historico = [];
  let rows = [];
  let chartsObj5 = {};

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const digits = v => String(v ?? '').replace(/\D/g, '');
  const norm = v => String(v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const pct = (a,b) => a ? (b / a) * 100 : 0;
  const pctBr = v => Number(v || 0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}) + '%';
  const dateBr = v => v ? new Date(v).toLocaleDateString('pt-BR') : '—';
  const canEdit = () => ['administrador','editor'].includes(norm(profile?.perfil));

  function addManagementFields(){
    try {
      if (typeof OBJ5_FIELDS !== 'undefined') {
        if (!OBJ5_FIELDS.some(x=>x[0]==='responsavel_pendencia')) OBJ5_FIELDS.push(['responsavel_pendencia','Responsável pela pendência']);
        if (!OBJ5_FIELDS.some(x=>x[0]==='prazo_pendencia')) OBJ5_FIELDS.push(['prazo_pendencia','Prazo da pendência']);
      }
    } catch(e) { console.warn('Campos adicionais Obj 05:', e); }
  }

  function statusFrom(o, resp){
    const c = resp?.campos || {};
    const blob = norm([
      o?.situacao, o?.status, o?._orig?.status, o?._orig?.situacao,
      c.situacao_contrato_anterior, c.situacao_licitacao_remanescente,
      c.estagio_projeto_remanescente, c.outras_observacoes
    ].join(' '));
    const localizada = !!o?._match || !/nao localizada|não localizada/.test(blob);
    const recontratada = /recontratad|novo contrato|contrato celebrado|contratada/.test(blob);
    const andamento = localizada && !recontratada;
    return { localizada, recontratada, andamento, blob };
  }

  function buildRows(){
    const base = typeof enrichObj5 === 'function'
      ? enrichObj5(PARALISADAS.map(p=>({...p,opus:p.opus||'',objetivoAudit:'OBJ5'})))
      : (typeof PARALISADAS !== 'undefined' ? PARALISADAS : []);
    const mapResp = new Map(respostas.map(r => [digits(r.opus)+'|'+String(r.contrato||''), r]));
    rows = base.map((o,idx)=>{
      const contrato = String(o.contratoObj5 || o.contrato || '');
      const r = mapResp.get(digits(o.opus)+'|'+contrato) || respostas.find(x=>digits(x.opus)===digits(o.opus)) || null;
      const a = auditorias.find(x=>x.chave===('OBJ5|'+digits(o.opus)+'|'+contrato)) || auditorias.find(x=>String(x.chave||'').includes(digits(o.opus)));
      const st = statusFrom(o,r);
      return {
        nr:o.nr||idx+1, acao:o.acao||o._orig?.acao||'', nome:o.nome||o.desc||o._orig?.nome||'', opus:o.opus||'', contrato,
        contratoPlanilha:o.contrato||'', empresa:o.empresa||'', valor:o.valorAtual||o.valor||'', pmed:o.pmed||'',
        statusInformado:r?.campos?.situacao_licitacao_remanescente || r?.campos?.situacao_contrato_anterior || o.status || '',
        situacao: st.recontratada ? 'Recontratada' : (st.localizada ? 'Localizada / em andamento' : 'Não localizada'),
        responsavel:r?.campos?.responsavel_pendencia || '', prazo:r?.campos?.prazo_pendencia || '',
        observacao:a?.observacao || r?.campos?.outras_observacoes || '', auditado:!!a?.auditado,
        ...st
      };
    });
    // Include records existing only in Supabase, preserving history and manual entries.
    respostas.filter(r=>r.codigo_objetivo==='OBJ5').forEach(r=>{
      if(rows.some(x=>digits(x.opus)===digits(r.opus) && String(x.contrato)===String(r.contrato||''))) return;
      const st=statusFrom({},r);
      rows.push({nr:rows.length+1,acao:'',nome:r.descricao_obra||'',opus:r.opus||'',contrato:r.contrato||'',contratoPlanilha:'',empresa:'',valor:'',pmed:r.percentual_medido||'',statusInformado:r.campos?.situacao_licitacao_remanescente||'',situacao:st.recontratada?'Recontratada':(st.localizada?'Localizada / em andamento':'Não localizada'),responsavel:r.campos?.responsavel_pendencia||'',prazo:r.campos?.prazo_pendencia||'',observacao:r.campos?.outras_observacoes||'',auditado:false,...st});
    });
  }

  function metrics(){
    const total=rows.length;
    const localizadas=rows.filter(x=>x.localizada).length;
    const recontratadas=rows.filter(x=>x.recontratada).length;
    const andamento=rows.filter(x=>x.andamento).length;
    const pendentes=rows.filter(x=>!x.localizada).length;
    return {total,localizadas,recontratadas,andamento,pendentes};
  }

  function evolutionSeries(){
    const byMonth = new Map();
    (historico||[]).forEach(h=>{
      const d=new Date(h.registrado_em||h.created_at||Date.now());
      const k=d.toISOString().slice(0,7);
      const after=h.depois?.campos||h.valor_novo?.campos||{};
      const blob=norm(Object.values(after).join(' '));
      if(!byMonth.has(k)) byMonth.set(k,{month:k,changes:0,recontratadas:0});
      const x=byMonth.get(k);x.changes++;
      if(/recontratad|novo contrato|contrato celebrado/.test(blob)) x.recontratadas++;
    });
    const current=metrics();
    const arr=[...byMonth.values()].sort((a,b)=>a.month.localeCompare(b.month)).slice(-11);
    if(!arr.length || arr[arr.length-1].month!==new Date().toISOString().slice(0,7)) arr.push({month:new Date().toISOString().slice(0,7),recontratadas:current.recontratadas,changes:0});
    else arr[arr.length-1].recontratadas=current.recontratadas;
    let last=0;
    return arr.map(x=>{last=Math.max(last,x.recontratadas);return {...x,recontratadas:last}});
  }

  function chart(id,type,data,options){
    chartsObj5[id]?.destroy?.();
    const el=document.getElementById(id); if(!el||typeof Chart==='undefined') return;
    chartsObj5[id]=new Chart(el,{type,data,options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},...options}});
  }

  function render(){
    const el=document.getElementById('obj5ind'); if(!el) return;
    buildRows(); const m=metrics();
    const tr=rows.map(x=>`<tr><td>${x.nr}</td><td>${esc(x.acao)}</td><td><b>${esc(x.nome)}</b></td><td>${esc(x.opus||'—')}</td><td>${esc(x.contrato||'—')}</td><td>${esc(x.empresa||'—')}</td><td>${esc(x.pmed||'—')}</td><td><span class="obj5i-badge ${x.recontratada?'green':x.localizada?'blue':'red'}">${esc(x.situacao)}</span></td><td>${esc(x.responsavel||'—')}</td><td>${esc(x.prazo||'—')}</td><td>${esc(x.observacao||'')}</td><td>${x.auditado?'✅':'—'}</td></tr>`).join('');
    el.innerHTML=`<div class="card"><h2>Indicadores do Objetivo 05 — Obras Paralisadas / Recontratação</h2>
      <div class="note">Painel cumulativo vinculado aos registros, observações e auditorias já salvos no Supabase. Nenhum dado histórico é excluído.</div>
      <div class="obj5i-actions"><button class="btn" onclick="show('obj5')">📋 Abrir tabela detalhada</button><button class="btn" onclick="location.href='/app/dashboard.html'">🏠 Dashboard</button><button class="btn" onclick="location.href='/app/fio.html'">📄 FIO</button><button class="btn blue" onclick="exportarObj5IndicadoresPDF()">📄 PDF completo</button><button class="btn blue" onclick="exportarObj5IndicadoresPPT()">📊 PPTX completo</button></div>
      <div class="obj5i-grid">
        <div class="obj5i-card"><div class="lbl">Total na lista</div><div class="val">${m.total}</div><div class="sub">100%</div></div>
        <div class="obj5i-card green"><div class="lbl">Localizadas</div><div class="val">${m.localizadas}</div><div class="sub">${pctBr(pct(m.total,m.localizadas))}</div></div>
        <div class="obj5i-card green"><div class="lbl">Recontratadas</div><div class="val">${m.recontratadas}</div><div class="sub">${pctBr(pct(m.total,m.recontratadas))}</div></div>
        <div class="obj5i-card orange"><div class="lbl">Em andamento</div><div class="val">${m.andamento}</div><div class="sub">${pctBr(pct(m.total,m.andamento))}</div></div>
        <div class="obj5i-card red"><div class="lbl">Não localizadas / pendentes</div><div class="val">${m.pendentes}</div><div class="sub">${pctBr(pct(m.total,m.pendentes))}</div></div>
        <div class="obj5i-card"><div class="lbl">% Recontratação</div><div class="val">${pctBr(pct(m.total,m.recontratadas))}</div><div class="sub">meta calculada automaticamente</div></div>
      </div>
      <div class="obj5i-charts"><div class="obj5i-chart"><b>Situação atual do Objetivo 05</b><canvas id="obj5Donut"></canvas></div><div class="obj5i-chart"><b>Evolução histórica da recontratação</b><canvas id="obj5Evolution"></canvas></div></div>
      <div class="card" style="margin-top:12px"><h3>Relação consolidada — observações e auditoria preservadas</h3><div class="tblbox"><table><thead><tr><th>Nr</th><th>Ação PEEx</th><th>Nome / Obra</th><th>Nº OPUS</th><th>Contrato</th><th>Empresa</th><th>% Med</th><th>Situação</th><th>Responsável</th><th>Prazo</th><th>Observações</th><th>Auditado</th></tr></thead><tbody>${tr||'<tr><td colspan="12">Sem registros.</td></tr>'}</tbody></table></div></div>
      <div class="obj-update-line">Atualizado em ${new Date().toLocaleString('pt-BR')} · usuário ${esc(profile?.nome||session?.user?.email||'')}</div></div>`;
    const evo=evolutionSeries();
    chart('obj5Donut','doughnut',{labels:['Recontratadas','Em andamento','Não localizadas'],datasets:[{data:[m.recontratadas,m.andamento,m.pendentes],backgroundColor:['#62a744','#2878ad','#c62828']}]},{cutout:'60%'});
    chart('obj5Evolution','line',{labels:evo.map(x=>new Date(x.month+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'short',year:'2-digit'})),datasets:[{label:'Recontratadas acumuladas',data:evo.map(x=>x.recontratadas),fill:false,tension:.25}]},{scales:{y:{beginAtZero:true,ticks:{precision:0}}}});
    saveSnapshot(m).catch(console.warn);
  }

  async function saveSnapshot(m){
    if(!sb||!canEdit()) return;
    await sb.from('objetivo5_indicadores_historico').upsert({data_referencia:new Date().toISOString().slice(0,10),total:m.total,localizadas:m.localizadas,recontratadas:m.recontratadas,em_andamento:m.andamento,pendentes:m.pendentes,percentual_localizadas:pct(m.total,m.localizadas),percentual_recontratadas:pct(m.total,m.recontratadas),percentual_pendentes:pct(m.total,m.pendentes),registrado_por:session.user.id,registrado_por_nome:profile?.nome||session.user.email,atualizado_em:new Date().toISOString()},{onConflict:'data_referencia'});
  }

  function makePrint(){
    let p=document.getElementById('obj5iPrint'); if(!p){p=document.createElement('div');p.id='obj5iPrint';p.className='obj5i-print';document.body.appendChild(p)}
    const m=metrics(); const donut=chartsObj5.obj5Donut?.toBase64Image?.()||''; const evolution=chartsObj5.obj5Evolution?.toBase64Image?.()||'';
    p.innerHTML=`<div style="font-family:Arial"><h1 style="text-align:center;color:#174f7d">OBJETIVO 05 — OBRAS PARALISADAS / RECONTRATAÇÃO</h1><p style="text-align:right">Atualizado em ${new Date().toLocaleString('pt-BR')}</p><table style="width:100%;border-collapse:collapse;text-align:center"><tr>${[['Total',m.total],['Localizadas',m.localizadas+' ('+pctBr(pct(m.total,m.localizadas))+')'],['Recontratadas',m.recontratadas+' ('+pctBr(pct(m.total,m.recontratadas))+')'],['Em andamento',m.andamento+' ('+pctBr(pct(m.total,m.andamento))+')'],['Pendentes',m.pendentes+' ('+pctBr(pct(m.total,m.pendentes))+')']].map(x=>`<td style="border:1px solid #7190aa;padding:10px"><b>${x[0]}</b><br><span style="font-size:22px">${x[1]}</span></td>`).join('')}</tr></table><div style="display:flex;gap:12px;margin-top:15px">${donut?`<img src="${donut}" style="width:48%">`:''}${evolution?`<img src="${evolution}" style="width:48%">`:''}</div><h2>Relação consolidada</h2><table style="width:100%;border-collapse:collapse;font-size:8px"><thead><tr>${['Nr','Ação','Obra','OPUS','Contrato','Situação','Responsável','Prazo','Observação','Auditado'].map(h=>`<th style="background:#174f7d;color:#fff;border:1px solid #aaa;padding:4px">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(x=>`<tr>${[x.nr,x.acao,x.nome,x.opus,x.contrato,x.situacao,x.responsavel,x.prazo,x.observacao,x.auditado?'Sim':'Não'].map(v=>`<td style="border:1px solid #bbb;padding:3px">${esc(v||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    return p;
  }

  window.exportarObj5IndicadoresPDF=()=>{makePrint();document.body.classList.add('print-obj5i');const done=()=>{document.body.classList.remove('print-obj5i');window.removeEventListener('afterprint',done)};window.addEventListener('afterprint',done);setTimeout(()=>window.print(),100)};

  window.exportarObj5IndicadoresPPT=async()=>{
    if(typeof PptxGenJS==='undefined') return alert('Biblioteca PPTX não carregada.');
    const m=metrics(), ppt=new PptxGenJS(); ppt.layout='LAYOUT_WIDE'; ppt.author='SIGOM — DOM'; ppt.subject='Objetivo 05'; ppt.title='Indicadores Objetivo 05';
    const s=ppt.addSlide(); s.background={color:'F3F6F9'}; s.addShape(ppt.ShapeType.rect,{x:0,y:0,w:13.333,h:.7,fill:{color:'174F7D'},line:{color:'174F7D'}}); s.addText('OBJETIVO 05 — OBRAS PARALISADAS / RECONTRATAÇÃO',{x:.3,y:.12,w:12.7,h:.35,color:'FFFFFF',bold:true,fontSize:22,align:'center'});
    const cards=[['TOTAL',m.total,'174F7D'],['LOCALIZADAS',m.localizadas+' · '+pctBr(pct(m.total,m.localizadas)),'62A744'],['RECONTRATADAS',m.recontratadas+' · '+pctBr(pct(m.total,m.recontratadas)),'62A744'],['EM ANDAMENTO',m.andamento+' · '+pctBr(pct(m.total,m.andamento)),'EF7D00'],['PENDENTES',m.pendentes+' · '+pctBr(pct(m.total,m.pendentes)),'C62828']];
    cards.forEach((c,i)=>{const x=.25+i*2.58;s.addShape(ppt.ShapeType.roundRect,{x,y:.9,w:2.38,h:1.0,rectRadius:.06,fill:{color:'FFFFFF'},line:{color:c[2],pt:1.5}});s.addText(c[0],{x:x+.1,y:1.02,w:2.18,h:.2,fontSize:9,color:'607D95',bold:true,align:'center'});s.addText(String(c[1]),{x:x+.1,y:1.3,w:2.18,h:.35,fontSize:18,color:c[2],bold:true,align:'center'})});
    const d=chartsObj5.obj5Donut?.toBase64Image?.(),e=chartsObj5.obj5Evolution?.toBase64Image?.();if(d)s.addImage({data:d,x:.35,y:2.15,w:5.9,h:3.25});if(e)s.addImage({data:e,x:6.75,y:2.15,w:5.9,h:3.25});s.addText('Atualizado em '+new Date().toLocaleString('pt-BR'),{x:9.4,y:7.1,w:3.4,h:.2,fontSize:8,color:'667788',align:'right'});
    const chunks=[];for(let i=0;i<rows.length;i+=10)chunks.push(rows.slice(i,i+10));chunks.forEach((chunk,ix)=>{const sl=ppt.addSlide();sl.addShape(ppt.ShapeType.rect,{x:0,y:0,w:13.333,h:.55,fill:{color:'174F7D'},line:{color:'174F7D'}});sl.addText('OBJETIVO 05 — Relação consolidada '+(ix+1)+'/'+chunks.length,{x:.3,y:.1,w:12.7,h:.25,color:'FFFFFF',bold:true,fontSize:18,align:'center'});const table=[['Nr','Ação','Obra','OPUS','Contrato','Situação','Responsável','Prazo','Observação','Audit.'],...chunk.map(x=>[x.nr,x.acao,String(x.nome).slice(0,55),x.opus,x.contrato,x.situacao,x.responsavel,x.prazo,String(x.observacao).slice(0,80),x.auditado?'Sim':'Não'])];sl.addTable(table,{x:.15,y:.75,w:13.0,h:6.4,colW:[.4,.65,2.7,1.15,.9,1.25,1.05,.8,3.2,.55],fontSize:7,border:{pt:.5,color:'AAB8C4'},fill:'FFFFFF',color:'1F2D3D',rowH:.45,margin:.03,bold:false});});
    await ppt.writeFile({fileName:'SIGOM_OBJ05_Indicadores_'+new Date().toISOString().slice(0,10)+'.pptx'});
  };

  async function init(){
    if(!sb) return;
    session=(await sb.auth.getSession()).data.session; if(!session) return;
    const [{data:p},{data:r},{data:a},{data:h}]=await Promise.all([
      sb.from('profiles').select('nome,perfil,ativo').eq('id',session.user.id).maybeSingle(),
      sb.from('objetivos_respostas').select('*').eq('codigo_objetivo','OBJ5').eq('exercicio',2026),
      sb.from('objetivos_auditoria').select('*').eq('objetivo','OBJ5'),
      sb.from('objetivos_respostas_historico').select('*').eq('codigo_objetivo','OBJ5').order('registrado_em',{ascending:true})
    ]);
    profile=p||{nome:session.user.email,perfil:'consulta'}; respostas=r||[]; auditorias=a||[]; historico=h||[];
    addManagementFields();
    setTimeout(()=>{try{window.renderObj5?.()}catch(e){};render()},500);
    const oldShow=window.show; window.show=function(id){oldShow(id);if(id==='obj5ind')setTimeout(render,50)};
  }
  setTimeout(()=>init().catch(e=>console.error('Indicadores Obj 05:',e)),2300);
})();
