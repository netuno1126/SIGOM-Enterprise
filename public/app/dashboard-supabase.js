'use strict';
const cfg=window.SIGOM_CONFIG;
const db=supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const state={all:[],filtered:[],groups:[],groupLinks:new Map(),portfolio:[],page:1,pageSize:50,sortKey:'opus',sortDir:1,charts:{}};
const $=id=>document.getElementById(id);
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});
const number=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});
const percent=v=>v==null||!Number.isFinite(Number(v))?'—':`${number.format(Number(v))}%`;
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;
const safeText=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function setStatus(text,isError=false){$('dataStatus').textContent=text;$('dataStatus').style.color=isError?'#b42318':''}
async function requireSession(){const {data:{session}}=await db.auth.getSession();if(!session)throw new Error('Sessão não encontrada. Entre novamente no SIGOM.');const {data:aal}=await db.auth.mfa.getAuthenticatorAssuranceLevel();if(cfg.requireMfa&&aal.currentLevel!=='aal2')throw new Error('Sessão sem segundo fator AAL2. Entre novamente.');return session}
async function loadAllRows(table,columns='*',order='opus'){
  const batch=1000;let from=0;const rows=[];
  while(true){const {data,error}=await db.from(table).select(columns).order(order,{ascending:true}).range(from,from+batch-1);if(error)throw error;rows.push(...(data||[]));if(!data||data.length<batch)break;from+=batch}
  return rows;
}
async function loadData(){
  setStatus('Carregando obras e grupos do Supabase...');$('refreshBtn').disabled=true;
  try{
    await requireSession();
    const [obras,grupos,links,portfolio]=await Promise.all([
      loadAllRows('obras','id,opus,contrato,rm,contratante,om_beneficiada,descricao,nome_obra,empresa,valor_atual,total_ne,total_nf,percentual_medido,percentual_estimado,dados,atualizado_em'),
      loadAllRows('grupos','id,nome,descricao,grupo_pai_id,arquivado','nome'),
      loadAllRows('grupo_obras','grupo_id,obra_id','grupo_id'),
      loadAllRows('portfolio_obras','id,opus,contrato,rm,contratante,om_beneficiada,descricao,nome_obra,empresa,valor_atual,total_ne,total_nf,percentual_medido,percentual_estimado,dados,atualizado_em')
    ]);
    state.all=obras;state.groups=grupos.filter(g=>!g.arquivado);state.portfolio=portfolio||[];state.groupLinks=new Map();
    links.forEach(l=>{if(!state.groupLinks.has(l.grupo_id))state.groupLinks.set(l.grupo_id,new Set());state.groupLinks.get(l.grupo_id).add(l.obra_id)});
    buildFilters();applyFilters();setStatus(`${obras.length.toLocaleString('pt-BR')} obras/contratos carregados do Supabase · atualização ${new Date().toLocaleString('pt-BR')}`);
  }catch(err){console.error(err);setStatus(`Erro ao carregar o dashboard: ${err.message}`,true);state.all=[];applyFilters()}
  finally{$('refreshBtn').disabled=false}
}
function uniqueValues(key){return [...new Set(state.all.map(r=>String(r[key]??'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true}))}
function fillSelect(id,values,first){const el=$(id),current=el.value;el.innerHTML=`<option value="">${first}</option>`+values.map(v=>`<option value="${safeText(v)}">${safeText(v)}</option>`).join('');if(values.includes(current))el.value=current}
function buildFilters(){fillSelect('rmFilter',uniqueValues('rm'),'Todas');fillSelect('contratanteFilter',uniqueValues('contratante'),'Todos');fillSelect('empresaFilter',uniqueValues('empresa'),'Todas');const el=$('grupoFilter'),cur=el.value;el.innerHTML='<option value="">Todos</option>'+state.groups.map(g=>`<option value="${g.id}">${safeText(g.nome)}</option>`).join('');if(state.groups.some(g=>g.id===cur))el.value=cur}
function passMedicao(v,range){const n=num(v);if(!range)return true;if(range==='sem-medicao')return !v||n===0;if(range==='0-25')return n>0&&n<=25;if(range==='25-50')return n>25&&n<=50;if(range==='50-75')return n>50&&n<=75;if(range==='75-100')return n>75&&n<=100;return true}
function applyFilters(){
  const q=norm($('searchInput').value),rm=$('rmFilter').value,cont=$('contratanteFilter').value,emp=$('empresaFilter').value,group=$('grupoFilter').value,range=$('medicaoFilter').value;
  const ids=group?state.groupLinks.get(group):null;
  state.filtered=state.all.filter(r=>{
    const hay=norm([r.opus,r.contrato,r.rm,r.contratante,r.om_beneficiada,r.descricao,r.nome_obra,r.empresa].join(' '));
    return(!q||hay.includes(q))&&(!rm||r.rm===rm)&&(!cont||r.contratante===cont)&&(!emp||r.empresa===emp)&&(!ids||ids.has(r.id))&&passMedicao(r.percentual_medido,range)
  });
  state.page=1;sortRows();renderAll();
}
function sortRows(){const k=state.sortKey,d=state.sortDir;state.filtered.sort((a,b)=>{let x=a[k],y=b[k];if(['valor_atual','total_ne','total_nf','percentual_medido','percentual_estimado'].includes(k)){x=num(x);y=num(y);return(x-y)*d}return String(x??'').localeCompare(String(y??''),'pt-BR',{numeric:true,sensitivity:'base'})*d})}
function idp(r){const m=num(r.percentual_medido),e=num(r.percentual_estimado);return m>0?e/m:null}
function renderKpis(){
  const a=state.filtered,totalValor=a.reduce((s,r)=>s+num(r.valor_atual),0),totalNE=a.reduce((s,r)=>s+num(r.total_ne),0),totalNF=a.reduce((s,r)=>s+num(r.total_nf),0);
  const med=a.map(r=>Number(r.percentual_medido)).filter(Number.isFinite),est=a.map(r=>Number(r.percentual_estimado)).filter(Number.isFinite),idps=a.map(idp).filter(Number.isFinite);
  $('kpiObras').textContent=a.length.toLocaleString('pt-BR');$('kpiFilterCount').textContent=`de ${state.all.length.toLocaleString('pt-BR')} na base`;$('kpiValor').textContent=money.format(totalValor);$('kpiNE').textContent=money.format(totalNE);$('kpiNF').textContent=money.format(totalNF);
  $('kpiNEPct').textContent=totalValor?`${number.format(totalNE/totalValor*100)}% do valor atual`:'—';$('kpiNFPct').textContent=totalValor?`${number.format(totalNF/totalValor*100)}% do valor atual`:'—';$('kpiMedido').textContent=percent(avg(med));$('kpiEstimado').textContent=percent(avg(est));$('kpiIDP').textContent=avg(idps)==null?'—':number.format(avg(idps));$('kpiSemMedicao').textContent=a.filter(r=>num(r.percentual_medido)===0).length.toLocaleString('pt-BR')
}
function aggregate(key,valueKey){const m=new Map();state.filtered.forEach(r=>{const k=String(r[key]||'Não informado').trim()||'Não informado';m.set(k,(m.get(k)||0)+(valueKey?num(r[valueKey]):1))});return [...m.entries()].sort((a,b)=>b[1]-a[1])}
function chart(id,type,labels,data,label,options={}){if(state.charts[id])state.charts[id].destroy();state.charts[id]=new Chart($(id),{type,data:{labels,datasets:[{label,data,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:options.indexAxis||'x',plugins:{legend:{display:type!=='bar'||options.legend===true},tooltip:{callbacks:{label:ctx=>options.money?`${ctx.dataset.label}: ${money.format(ctx.raw)}`:`${ctx.dataset.label}: ${number.format(ctx.raw)}`}}},scales:{x:{ticks:{autoSkip:false,maxRotation:options.rotate||0}},y:{beginAtZero:true}}}})}
function renderCharts(){
  const contrat=aggregate('contratante','valor_atual').slice(0,12);chart('chartContratante','bar',contrat.map(x=>x[0]),contrat.map(x=>x[1]),'Valor atual',{money:true,rotate:35});
  const totalValor=state.filtered.reduce((s,r)=>s+num(r.valor_atual),0),med=avg(state.filtered.map(r=>Number(r.percentual_medido)).filter(Number.isFinite))||0,est=avg(state.filtered.map(r=>Number(r.percentual_estimado)).filter(Number.isFinite))||0,emp=totalValor?state.filtered.reduce((s,r)=>s+num(r.total_ne),0)/totalValor*100:0,exe=totalValor?state.filtered.reduce((s,r)=>s+num(r.total_nf),0)/totalValor*100:0;
  chart('chartExecucao','bar',['% Medido','% Estimado','% Empenhado','% Executado'],[med,est,emp,exe],'Percentual');
  const rms=aggregate('rm').slice(0,20);chart('chartRM','bar',rms.map(x=>x[0]),rms.map(x=>x[1]),'Obras',{rotate:35});
  const empresas=aggregate('empresa','valor_atual').slice(0,10);chart('chartEmpresas','bar',empresas.map(x=>x[0]),empresas.map(x=>x[1]),'Valor atual',{money:true,indexAxis:'y'});
}
function renderTable(){
  state.pageSize=Number($('pageSize').value);const pages=Math.max(1,Math.ceil(state.filtered.length/state.pageSize));state.page=Math.min(state.page,pages);const start=(state.page-1)*state.pageSize,rows=state.filtered.slice(start,start+state.pageSize);
  $('tableCount').textContent=`${state.filtered.length.toLocaleString('pt-BR')} registros`;$('pageInfo').textContent=`Página ${state.page} de ${pages}`;$('prevPage').disabled=state.page<=1;$('nextPage').disabled=state.page>=pages;
  $('tableBody').innerHTML=rows.length?rows.map(r=>`<tr><td>${safeText(r.opus)}</td><td>${safeText(r.contrato)}</td><td>${safeText(r.rm)}</td><td title="${safeText(r.nome_obra||r.descricao)}">${safeText(r.nome_obra||r.descricao)}</td><td title="${safeText(r.om_beneficiada)}">${safeText(r.om_beneficiada)}</td><td title="${safeText(r.empresa)}">${safeText(r.empresa)}</td><td class="num">${money.format(num(r.valor_atual))}</td><td class="num">${money.format(num(r.total_ne))}</td><td class="num">${money.format(num(r.total_nf))}</td><td class="num">${percent(r.percentual_medido)}</td><td class="num">${percent(r.percentual_estimado)}</td><td class="num">${idp(r)==null?'—':number.format(idp(r))}</td><td><button class="detail-btn" data-id="${r.id}">Detalhar</button></td></tr>`).join(''):`<tr><td colspan="13" class="empty">Nenhuma obra encontrada com os filtros aplicados.</td></tr>`;
  document.querySelectorAll('.detail-btn').forEach(b=>b.onclick=()=>openDetail(b.dataset.id));
}
function renderAll(){renderKpis();renderCharts();renderTable()}
function openDetail(rowId){const r=state.all.find(x=>x.id===rowId);if(!r)return;$('detailTitle').textContent=`${r.opus||'Sem OPUS'} — ${r.nome_obra||r.descricao||'Obra'}`;const fields=[['Contrato',r.contrato],['RM',r.rm],['Contratante',r.contratante],['OM beneficiada',r.om_beneficiada],['Empresa',r.empresa],['Valor atual',money.format(num(r.valor_atual))],['Empenhado (NE)',money.format(num(r.total_ne))],['Executado (NF)',money.format(num(r.total_nf))],['% Medido',percent(r.percentual_medido)],['% Estimado',percent(r.percentual_estimado)],['IDP',idp(r)==null?'—':number.format(idp(r))],['Atualizado em',r.atualizado_em?new Date(r.atualizado_em).toLocaleString('pt-BR'):'—']];$('detailContent').innerHTML=fields.map(([k,v])=>`<div class="detail-item"><b>${k}</b>${safeText(v)}</div>`).join('')+`<div class="detail-json"><b>Dados originais preservados</b>\n${safeText(JSON.stringify(r.dados||{},null,2))}</div>`;$('detailDialog').showModal()}
function exportCsv(){const cols=['opus','contrato','rm','contratante','om_beneficiada','nome_obra','descricao','empresa','valor_atual','total_ne','total_nf','percentual_medido','percentual_estimado'];const quote=v=>`"${String(v??'').replace(/"/g,'""')}"`;const csv=['\ufeff'+cols.join(';'),...state.filtered.map(r=>cols.map(c=>quote(r[c])).join(';'))].join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`SIGOM_obras_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href)}
['searchInput'].forEach(id=>$(id).addEventListener('input',applyFilters));['rmFilter','contratanteFilter','empresaFilter','grupoFilter','medicaoFilter'].forEach(id=>$(id).addEventListener('change',applyFilters));$('clearFiltersBtn').onclick=()=>{['searchInput','rmFilter','contratanteFilter','empresaFilter','grupoFilter','medicaoFilter'].forEach(id=>$(id).value='');applyFilters()};$('refreshBtn').onclick=loadData;$('exportBtn').onclick=exportCsv;$('printBtn').onclick=()=>window.print();$('pageSize').onchange=()=>{state.page=1;renderTable()};$('prevPage').onclick=()=>{state.page--;renderTable()};$('nextPage').onclick=()=>{state.page++;renderTable()};$('closeDetail').onclick=()=>$('detailDialog').close();document.querySelectorAll('th[data-sort]').forEach(th=>th.onclick=()=>{const k=th.dataset.sort;if(state.sortKey===k)state.sortDir*=-1;else{state.sortKey=k;state.sortDir=1}sortRows();renderTable()});loadData();
