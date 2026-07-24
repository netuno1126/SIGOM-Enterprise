import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg=window.SIGOM_CONFIG;
const supabase=createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const cleanText=v=>v==null?'':String(v).normalize('NFC').trim();
let pendingFactorId=null,currentUser=null,currentProfile=null,allWorks=[],filteredWorks=[],selectedFile=null;
const canEdit=()=>['administrador','editor'].includes(currentProfile?.perfil);
const brl=n=>(Number.isFinite(Number(n))?Number(n):0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pct=v=>{const n=Number(v);if(!Number.isFinite(n))return '—';return (Math.abs(n)<=1?n*100:n).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';};
const dateTime=v=>v?new Date(v).toLocaleString('pt-BR'):'—';
function show(view){['loginView','mfaView','appView'].forEach(id=>$(id).classList.toggle('hidden',id!==view));}
function message(id,text=''){$(id).textContent=text;}
function log(text){$('importLog').textContent+=`\n${text}`;$('importLog').scrollTop=$('importLog').scrollHeight;}

async function getProfile(userId){const {data,error}=await supabase.from('profiles').select('*').eq('id',userId).single();if(error)throw error;return data;}
async function routeSession(session){
  if(!session){currentUser=currentProfile=null;show('loginView');return;}
  const {data:aalData}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const {data:factorsData}=await supabase.auth.mfa.listFactors();
  const verified=factorsData?.totp?.find(f=>f.status==='verified');
  if(verified&&aalData?.currentLevel!=='aal2'){pendingFactorId=verified.id;$('enrollMfaBtn').classList.add('hidden');$('mfaQrWrap').classList.add('hidden');show('mfaView');return;}
  await loadApp(session.user,aalData?.currentLevel||'aal1');
}
async function loadApp(user,aal){
  currentUser=user;currentProfile=await getProfile(user.id);
  $('versionLabel').textContent=`V${cfg.version}`;$('welcomeTitle').textContent=`Bem-vindo, ${currentProfile.nome||user.email}`;$('profileSummary').textContent=`Perfil: ${currentProfile.perfil} · ${user.email}`;
  $('adminNav').classList.toggle('hidden',currentProfile.perfil!=='administrador');$('aalStatus').textContent=String(aal).toUpperCase();
  $('importPermission').classList.toggle('hidden',canEdit());$('importBox').classList.toggle('hidden',!canEdit());$('importBtn').classList.toggle('hidden',!canEdit());
  show('appView');showPage('dashboard');await refreshAll();
}
function showPage(name){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('hidden',p.id!==`page-${name}`));document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===name));if(name==='works')renderWorks();if(name==='imports')loadImports();if(name==='groups')loadGroups();if(name==='admin'&&currentProfile?.perfil==='administrador'){loadUsers();activateAdminTab('users');}}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
$('openImportBtn').addEventListener('click',()=>showPage('imports'));
$('refreshBtn').addEventListener('click',refreshAll);

async function fetchAllWorks(){
  const rows=[];let from=0;const page=1000;
  while(true){const {data,error}=await supabase.from('obras').select('*').order('atualizado_em',{ascending:false}).range(from,from+page-1);if(error)throw error;rows.push(...(data||[]));if(!data||data.length<page)break;from+=page;}
  allWorks=rows;populateFilters();applyWorkFilters();return rows;
}
async function refreshAll(){
  $('baseStatus').textContent='Atualizando dados...';
  try{
    const works=await fetchAllWorks();
    const [{count:groups},{count:fio},{data:lastImport}]=await Promise.all([
      supabase.from('grupos').select('*',{count:'exact',head:true}).eq('arquivado',false),
      supabase.from('fio_edicoes').select('*',{count:'exact',head:true}),
      supabase.from('importacoes_planilha').select('*').order('importado_em',{ascending:false}).limit(1).maybeSingle()
    ]);
    $('worksCount').textContent=works.length;$('valueCount').textContent=brl(works.reduce((s,r)=>s+(Number(r.valor_atual)||0),0));$('groupsCount').textContent=groups||0;$('fioCount').textContent=fio||0;
    $('lastImport').textContent=lastImport?`${lastImport.nome_arquivo} · ${lastImport.obras_processadas} obras · ${dateTime(lastImport.importado_em)}`:'Nenhuma importação registrada.';
    $('baseStatus').textContent=`${works.length} obras sincronizadas com o Supabase.`;
  }catch(e){$('baseStatus').textContent='Erro: '+e.message;}
}
function populateFilters(){
  const fill=(id,vals,label)=>{const s=$(id),old=s.value;s.innerHTML=`<option value="">${label}</option>`+[...new Set(vals.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR',{numeric:true})).map(v=>`<option>${escapeHtml(v)}</option>`).join('');s.value=old;};
  fill('filterRm',allWorks.map(r=>r.rm),'RM — todas');fill('filterCompany',allWorks.map(r=>r.empresa),'Empresa — todas');
}
function applyWorkFilters(){const q=norm($('workSearch').value),rm=$('filterRm').value,emp=$('filterCompany').value;filteredWorks=allWorks.filter(r=>(!rm||r.rm===rm)&&(!emp||r.empresa===emp)&&(!q||norm([r.opus,r.contrato,r.descricao,r.nome_obra,r.empresa,r.om_beneficiada,r.contratante].join(' ')).includes(q)));renderWorks();}
['workSearch','filterRm','filterCompany'].forEach(id=>$(id).addEventListener(id==='workSearch'?'input':'change',applyWorkFilters));
function renderWorks(){
  const body=$('worksBody');body.innerHTML=filteredWorks.slice(0,1000).map(r=>`<tr><td>${escapeHtml(r.rm||'')}</td><td>${escapeHtml(r.opus)}</td><td>${escapeHtml(r.contrato||'')}</td><td>${escapeHtml(r.nome_obra||r.descricao||'')}</td><td>${escapeHtml(r.empresa||'')}</td><td>${brl(r.valor_atual)}</td><td>${brl(r.total_ne)}</td><td>${brl(r.total_nf)}</td><td>${pct(r.percentual_medido)}</td><td>${dateTime(r.atualizado_em)}</td></tr>`).join('');
  $('workSummary').textContent=`${filteredWorks.length} obra(s) · Valor Atual ${brl(filteredWorks.reduce((s,r)=>s+(Number(r.valor_atual)||0),0))}${filteredWorks.length>1000?' · exibindo as primeiras 1.000':''}`;
}
function csvCell(v){const s=String(v??'').replace(/"/g,'""');return `"${s}"`;}
$('exportCsvBtn').addEventListener('click',()=>{const headers=['RM','Nº OPUS','Contrato','Obra','Empresa','Valor Atual','Total NE','Total NF','% Medido'];const lines=[headers.map(csvCell).join(';'),...filteredWorks.map(r=>[r.rm,r.opus,r.contrato,r.nome_obra||r.descricao,r.empresa,r.valor_atual,r.total_ne,r.total_nf,r.percentual_medido].map(csvCell).join(';'))];const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});downloadBlob(blob,'SIGOM_obras_filtradas.csv');});

const ALIASES={
 opus:['solicitação','solicitacao','nr solicitação','nr solicitacao','nº solicitação','nº opus','nr opus','opus','código da obra','codigo da obra'],
 contrato:['contrato','nr contrato','nº contrato','numero contrato'],rm:['rm','região militar','regiao militar'],contratante:['contratante','om contratante','órgão contratante','orgao contratante'],
 om_beneficiada:['om beneficiada','organização militar beneficiada','organizacao militar beneficiada'],descricao:['descrição','descricao','descrição solicitação','descricao solicitacao','descrição da obra','descricao da obra'],
 nome_obra:['nome da obra'],empresa:['empresa','fornecedor','nome fornecedor','contratada','construtora'],valor_atual:['valor atual','valor total','valor contratado atual'],total_ne:['total ne','total empenho','empenho','total empenhado'],total_nf:['total notas fiscais','total de notas fiscais','total nf','total liquidado'],percentual_medido:['% medido','percentual medido'],percentual_estimado:['% estimado','percentual estimado']
};
const aliasMap=new Map(Object.entries(ALIASES).flatMap(([canon,names])=>names.map(n=>[norm(n),canon])));
function toNumber(v){if(v==null||v==='')return null;if(typeof v==='number')return Number.isFinite(v)?v:null;let s=String(v).replace(/R\$|\s|%/g,'');if(!s||s==='-')return null;if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');const n=Number(s);return Number.isFinite(n)?n:null;}
function fmtContract(v){if(v==null||v==='')return '';if(v instanceof Date)return `${String(v.getMonth()+1).padStart(2,'0')}/${v.getFullYear()}`;if(typeof v==='number'&&window.XLSX){try{const d=XLSX.SSF.parse_date_code(v);if(d&&d.y>2000)return `${String(d.m).padStart(2,'0')}/${d.y}`;}catch{}}return cleanText(v);}
function normalizeImportRows(rows){
  return rows.map((raw,index)=>{const c={};for(const [k,v] of Object.entries(raw)){const canon=aliasMap.get(norm(k));if(canon&&(c[canon]==null||c[canon]===''))c[canon]=v;}
    const opus=cleanText(c.opus).replace(/\.0$/,'');if(!opus)return {error:`Linha ${index+2}: Nº OPUS vazio`};
    return {value:{opus,contrato:fmtContract(c.contrato),rm:cleanText(c.rm),contratante:cleanText(c.contratante),om_beneficiada:cleanText(c.om_beneficiada),descricao:cleanText(c.descricao),nome_obra:cleanText(c.nome_obra),empresa:cleanText(c.empresa),valor_atual:toNumber(c.valor_atual),total_ne:toNumber(c.total_ne),total_nf:toNumber(c.total_nf),percentual_medido:toNumber(c.percentual_medido),percentual_estimado:toNumber(c.percentual_estimado),dados:jsonSafe(raw),atualizado_por:currentUser.id,atualizado_em:new Date().toISOString()}};
  });
}
function jsonSafe(obj){return JSON.parse(JSON.stringify(obj,(_k,v)=>v instanceof Date?v.toISOString():Number.isNaN(v)?null:v));}
function pickWorksheet(wb){let best=null,bestScore=-1;for(const name of wb.SheetNames){const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:null,raw:true});if(!rows.length)continue;const keys=Object.keys(rows[0]).map(norm);const score=(keys.some(k=>ALIASES.opus.map(norm).includes(k))?5:0)+(keys.some(k=>k.includes('contrato'))?2:0)+(keys.some(k=>k.includes('valor'))?1:0)+(keys.some(k=>k.includes('medido'))?1:0);if(score>bestScore){best={name,rows};bestScore=score;}}if(!best)throw new Error('Nenhuma aba com dados foi encontrada.');return best;}
$('excelFile').addEventListener('change',e=>{selectedFile=e.target.files?.[0]||null;$('importLog').textContent=selectedFile?`Arquivo selecionado: ${selectedFile.name}`:'Aguardando arquivo.';});
$('importBtn').addEventListener('click',importExcel);
async function importExcel(){
  if(!canEdit())return alert('Seu perfil não permite importar.');if(!selectedFile)return alert('Selecione uma planilha.');
  $('importBtn').disabled=true;$('importProgress').value=2;$('importLog').textContent='Iniciando importação...';let importId=null;
  try{
    const buffer=await selectedFile.arrayBuffer();const wb=XLSX.read(buffer,{type:'array',cellDates:true});const picked=pickWorksheet(wb);log(`Aba escolhida: ${picked.name} (${picked.rows.length} linhas).`);
    const normalized=normalizeImportRows(picked.rows),errors=normalized.filter(x=>x.error).map(x=>x.error),valid=normalized.filter(x=>x.value).map(x=>x.value);
    if(!valid.length)throw new Error('Nenhuma obra válida com Nº OPUS foi encontrada.');
    const {data:imp,error:impErr}=await supabase.from('importacoes_planilha').insert({nome_arquivo:selectedFile.name,tamanho_bytes:selectedFile.size,linhas_lidas:picked.rows.length,obras_com_erro:errors.length,status:'processando',detalhes:{aba:picked.name,erros_iniciais:errors.slice(0,100)},importado_por:currentUser.id}).select().single();if(impErr)throw impErr;importId=imp.id;
    const chunkSize=200;let done=0;for(let i=0;i<valid.length;i+=chunkSize){const chunk=valid.slice(i,i+chunkSize).map(r=>({...r,origem_importacao_id:importId}));const {error}=await supabase.from('obras').upsert(chunk,{onConflict:'opus,contrato',ignoreDuplicates:false});if(error)throw new Error(`Lote ${Math.floor(i/chunkSize)+1}: ${error.message}`);done+=chunk.length;$('importProgress').value=Math.round(done/valid.length*95);log(`${done}/${valid.length} obras enviadas.`);}
    await supabase.from('importacoes_planilha').update({obras_processadas:valid.length,obras_com_erro:errors.length,status:errors.length?'concluida_com_erros':'concluida',concluido_em:new Date().toISOString(),detalhes:{aba:picked.name,erros:errors.slice(0,200)}}).eq('id',importId);
    $('importProgress').value=100;log(`Concluído: ${valid.length} obras processadas; ${errors.length} erro(s).`);await refreshAll();await loadImports();
  }catch(e){log('ERRO: '+e.message);if(importId)await supabase.from('importacoes_planilha').update({status:'falhou',concluido_em:new Date().toISOString(),detalhes:{erro:e.message}}).eq('id',importId);}
  finally{$('importBtn').disabled=false;}
}
async function loadImports(){const {data,error}=await supabase.from('importacoes_planilha').select('*').order('importado_em',{ascending:false}).limit(30);$('importsBody').innerHTML=error?`<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`:(data||[]).map(r=>`<tr><td>${dateTime(r.importado_em)}</td><td>${escapeHtml(r.nome_arquivo)}</td><td>${r.linhas_lidas}</td><td>${r.obras_processadas}</td><td>${r.obras_com_erro}</td><td>${escapeHtml(r.status)}</td></tr>`).join('');}

$('loginForm').addEventListener('submit',async e=>{e.preventDefault();message('loginMessage','Entrando...');const {data,error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){message('loginMessage',error.message);return;}message('loginMessage','');await routeSession(data.session);});
$('mfaForm').addEventListener('submit',async e=>{e.preventDefault();message('mfaMessage','Verificando...');const code=$('mfaCode').value.trim();if(!pendingFactorId){message('mfaMessage','Fator MFA não identificado.');return;}const {data:challenge,error:ce}=await supabase.auth.mfa.challenge({factorId:pendingFactorId});if(ce){message('mfaMessage',ce.message);return;}const {error}=await supabase.auth.mfa.verify({factorId:pendingFactorId,challengeId:challenge.id,code});if(error){message('mfaMessage',error.message);return;}const {data:{session}}=await supabase.auth.getSession();await routeSession(session);});
$('enrollMfaBtn').addEventListener('click',async()=>{const {data,error}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'SIGOM 2026'});if(error){message('mfaMessage',error.message);return;}pendingFactorId=data.id;$('mfaQr').src=data.totp.qr_code;$('mfaSecret').textContent=data.totp.secret;$('mfaQrWrap').classList.remove('hidden');$('mfaText').textContent='Escaneie o QR Code e depois informe o código de 6 dígitos.';});
$('logoutBtn').addEventListener('click',async()=>{await supabase.auth.signOut();show('loginView');});
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
supabase.auth.onAuthStateChange((_event,session)=>setTimeout(()=>routeSession(session).catch(e=>message('loginMessage',e.message)),0));
const {data:{session}}=await supabase.auth.getSession();if(session){const {data:factors}=await supabase.auth.mfa.listFactors();if(!factors?.totp?.some(f=>f.status==='verified'))$('enrollMfaBtn').classList.remove('hidden');}await routeSession(session);


// V30.2 — Grupos, subgrupos e administração de usuários
let groupsData=[],selectedGroupId=null,showArchivedGroups=false;
const groupById=id=>groupsData.find(g=>g.id===id);
function groupPath(g){const parts=[g.nome];let p=g.grupo_pai_id?groupById(g.grupo_pai_id):null;while(p){parts.unshift(p.nome);p=p.grupo_pai_id?groupById(p.grupo_pai_id):null;}return parts.join(' › ');}
async function loadGroups(){
  const {data,error}=await supabase.from('grupos').select('*').order('nome');
  if(error){$('groupsList').innerHTML=`<div class="notice">${escapeHtml(error.message)}</div>`;return;}
  groupsData=data||[];renderGroupsList();if(selectedGroupId&&groupById(selectedGroupId))await selectGroup(selectedGroupId);else $('groupDetail').innerHTML='<div class="empty-state">Selecione um grupo.</div>';
}
function renderGroupsList(){
  const q=norm($('groupSearch')?.value||'');const children=new Map();groupsData.forEach(g=>{const k=g.grupo_pai_id||'root';if(!children.has(k))children.set(k,[]);children.get(k).push(g);});
  const walk=(parent,depth=0)=>(children.get(parent)||[]).filter(g=>(showArchivedGroups||!g.arquivado)&&(!q||norm(groupPath(g)+' '+g.descricao).includes(q))).map(g=>`<div class="group-card ${g.id===selectedGroupId?'active':''} ${g.arquivado?'archived':''}" data-group-id="${g.id}" style="margin-left:${Math.min(depth,3)*12}px"><strong>${escapeHtml(g.nome)}</strong>${g.grupo_pai_id?'<span class="badge">Subgrupo</span>':''}${g.arquivado?'<span class="badge">Arquivado</span>':''}<small>${escapeHtml(g.descricao||'Sem descrição')}</small></div>${walk(g.id,depth+1)}`).join('');
  $('groupsList').innerHTML=walk('root')||'<div class="muted">Nenhum grupo encontrado.</div>';
  $('groupsList').querySelectorAll('[data-group-id]').forEach(el=>el.onclick=()=>selectGroup(el.dataset.groupId));
}
async function selectGroup(id){selectedGroupId=id;renderGroupsList();const g=groupById(id);if(!g)return;
  const {data:links,error}=await supabase.from('grupo_obras').select('obra_id,adicionado_em,obras(*)').eq('grupo_id',id).order('adicionado_em',{ascending:false});
  if(error){$('groupDetail').innerHTML=`<div class="notice">${escapeHtml(error.message)}</div>`;return;}
  const rows=(links||[]).map(x=>x.obras).filter(Boolean);
  $('groupDetail').innerHTML=`<div class="page-head"><div><h3>${escapeHtml(g.nome)}</h3><div class="subgroup-path">${escapeHtml(groupPath(g))}</div><p>${escapeHtml(g.descricao||'Sem descrição')}</p></div><div><span class="badge">${rows.length} obra(s)</span></div></div><div class="group-toolbar">${canEdit()?`<button data-gact="add">Adicionar obras</button><button data-gact="sub" class="secondary">Novo subgrupo</button><button data-gact="edit" class="secondary">Editar</button><button data-gact="archive" class="${g.arquivado?'success':'danger'}">${g.arquivado?'Desarquivar':'Arquivar'}</button>`:''}</div><div class="table-wrap"><table><thead><tr><th>OPUS</th><th>Contrato</th><th>Obra</th><th>Empresa</th><th>RM</th>${canEdit()?'<th>Ação</th>':''}</tr></thead><tbody>${rows.length?rows.map(w=>`<tr><td>${escapeHtml(w.opus)}</td><td>${escapeHtml(w.contrato)}</td><td>${escapeHtml(w.nome_obra||w.descricao)}</td><td>${escapeHtml(w.empresa)}</td><td>${escapeHtml(w.rm)}</td>${canEdit()?`<td><button class="danger" data-remove-work="${w.id}">Remover</button></td>`:''}</tr>`).join(''):`<tr><td colspan="6">Nenhuma obra neste grupo.</td></tr>`}</tbody></table></div>`;
  $('groupDetail').querySelector('[data-gact="add"]')?.addEventListener('click',openAddWorks);
  $('groupDetail').querySelector('[data-gact="sub"]')?.addEventListener('click',()=>openGroupDialog(null,id));
  $('groupDetail').querySelector('[data-gact="edit"]')?.addEventListener('click',()=>openGroupDialog(g));
  $('groupDetail').querySelector('[data-gact="archive"]')?.addEventListener('click',()=>toggleArchiveGroup(g));
  $('groupDetail').querySelectorAll('[data-remove-work]').forEach(b=>b.onclick=()=>removeWorkFromGroup(b.dataset.removeWork));
}
function fillGroupParents(excludeId=''){const opts=groupsData.filter(g=>!g.arquivado&&g.id!==excludeId).map(g=>`<option value="${g.id}">${escapeHtml(groupPath(g))}</option>`).join('');$('groupParent').innerHTML='<option value="">Nenhum — grupo principal</option>'+opts;}
function openGroupDialog(g=null,parentId=''){fillGroupParents(g?.id||'');$('groupDialogTitle').textContent=g?'Editar grupo':(parentId?'Novo subgrupo':'Novo grupo');$('groupId').value=g?.id||'';$('groupName').value=g?.nome||'';$('groupDescription').value=g?.descricao||'';$('groupParent').value=g?.grupo_pai_id||parentId||'';$('groupDialog').showModal();}
$('newGroupBtn')?.addEventListener('click',()=>openGroupDialog());$('showArchivedBtn')?.addEventListener('click',()=>{showArchivedGroups=!showArchivedGroups;$('showArchivedBtn').textContent=showArchivedGroups?'Ocultar arquivados':'Exibir arquivados';renderGroupsList();});$('groupSearch')?.addEventListener('input',renderGroupsList);
$('groupForm')?.addEventListener('submit',async e=>{e.preventDefault();if(!canEdit())return;const id=$('groupId').value;const payload={nome:cleanText($('groupName').value),descricao:cleanText($('groupDescription').value),grupo_pai_id:$('groupParent').value||null,atualizado_por:currentUser.id,atualizado_em:new Date().toISOString()};if(!id)payload.criado_por=currentUser.id;const q=id?supabase.from('grupos').update(payload).eq('id',id):supabase.from('grupos').insert(payload);const {data,error}=await q.select().single();if(error){alert(error.message);return;}$('groupDialog').close();selectedGroupId=data.id;await loadGroups();await refreshAll();});
async function toggleArchiveGroup(g){if(!confirm(`${g.arquivado?'Desarquivar':'Arquivar'} o grupo “${g.nome}”?`))return;const {error}=await supabase.from('grupos').update({arquivado:!g.arquivado,arquivado_em:g.arquivado?null:new Date().toISOString(),atualizado_por:currentUser.id,atualizado_em:new Date().toISOString()}).eq('id',g.id);if(error)return alert(error.message);await loadGroups();await refreshAll();}
async function openAddWorks(){if(!allWorks.length)await fetchAllWorks();$('addWorksSearch').value='';renderAddWorksList();$('addWorksDialog').showModal();}
function renderAddWorksList(){const q=norm($('addWorksSearch').value);const rows=allWorks.filter(w=>!q||norm([w.opus,w.contrato,w.nome_obra,w.descricao,w.empresa].join(' ')).includes(q)).slice(0,300);$('addWorksList').innerHTML=rows.map(w=>`<label class="pick-row"><input type="checkbox" value="${w.id}"><span><strong>${escapeHtml(w.opus)} · ${escapeHtml(w.contrato)}</strong><br>${escapeHtml(w.nome_obra||w.descricao||'Sem nome')}<br><small>${escapeHtml(w.empresa||'')} · ${escapeHtml(w.rm||'')}</small></span></label>`).join('')||'<div class="empty-state">Nenhuma obra encontrada.</div>';}
$('addWorksSearch')?.addEventListener('input',renderAddWorksList);
$('addWorksForm')?.addEventListener('submit',async e=>{e.preventDefault();const ids=[...$('addWorksList').querySelectorAll('input:checked')].map(i=>i.value);if(!ids.length)return alert('Selecione ao menos uma obra.');const payload=ids.map(obra_id=>({grupo_id:selectedGroupId,obra_id,adicionado_por:currentUser.id}));const {error}=await supabase.from('grupo_obras').upsert(payload,{onConflict:'grupo_id,obra_id',ignoreDuplicates:true});if(error)return alert(error.message);$('addWorksDialog').close();await selectGroup(selectedGroupId);});
async function removeWorkFromGroup(obraId){if(!confirm('Remover esta obra do grupo?'))return;const {error}=await supabase.from('grupo_obras').delete().eq('grupo_id',selectedGroupId).eq('obra_id',obraId);if(error)return alert(error.message);await selectGroup(selectedGroupId);}
document.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.closeDialog).close()));

async function apiAdmin(path,options={}){const {data:{session}}=await supabase.auth.getSession();const res=await fetch('/.netlify/functions/'+path,{...options,headers:{'content-type':'application/json','authorization':'Bearer '+session.access_token,...(options.headers||{})}});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||`Erro HTTP ${res.status}`);return data;}
async function loadUsers(){try{const {users}=await apiAdmin('admin-list-users');$('usersBody').innerHTML=users.map(u=>`<tr><td>${escapeHtml(u.nome||'')}</td><td>${escapeHtml(u.email)}</td><td><select data-role-id="${u.id}">${['consulta','editor','auditor','administrador'].map(r=>`<option value="${r}" ${u.perfil===r?'selected':''}>${r}</option>`).join('')}</select></td><td><span class="status-dot ${u.ativo?'on':'off'}"></span>${u.ativo?'Sim':'Não'}</td><td>${dateTime(u.last_sign_in_at)}</td><td class="icon-actions"><button data-save-user="${u.id}">Salvar</button><button class="${u.ativo?'danger':'success'}" data-toggle-user="${u.id}" data-active="${u.ativo}">${u.ativo?'Desativar':'Ativar'}</button></td></tr>`).join('');$('usersBody').querySelectorAll('[data-save-user]').forEach(b=>b.onclick=()=>updateUser(b.dataset.saveUser,{perfil:$(`[data-role-id="${b.dataset.saveUser}"]`)?.value}));$('usersBody').querySelectorAll('[data-toggle-user]').forEach(b=>b.onclick=()=>updateUser(b.dataset.toggleUser,{ativo:b.dataset.active!=='true'}));}catch(e){$('usersBody').innerHTML=`<tr><td colspan="6">${escapeHtml(e.message)}</td></tr>`;}}
async function updateUser(id,changes){try{await apiAdmin('admin-update-user',{method:'POST',body:JSON.stringify({id,...changes})});await loadUsers();}catch(e){alert(e.message);}}
$('newUserBtn')?.addEventListener('click',()=>$('userDialog').showModal());$('userForm')?.addEventListener('submit',async e=>{e.preventDefault();try{await apiAdmin('admin-create-user',{method:'POST',body:JSON.stringify({nome:cleanText($('userName').value),email:cleanText($('userEmail').value),password:$('userPassword').value,perfil:$('userRole').value})});$('userDialog').close();e.target.reset();await loadUsers();}catch(err){alert(err.message);}});


// V30.4 — Administração de dados e importação web de grupos
let lastMissingWorks=[];
function activateAdminTab(name){
  document.querySelectorAll('[data-admin-tab]').forEach(b=>b.classList.toggle('active',b.dataset.adminTab===name));
  document.querySelectorAll('.admin-tab-panel').forEach(p=>p.classList.toggle('hidden',p.id!==`adminTab-${name}`));
}
document.querySelectorAll('[data-admin-tab]').forEach(b=>b.addEventListener('click',()=>activateAdminTab(b.dataset.adminTab)));
function resetMigrationCounters(){['migGroupsCount','migSubgroupsCount','migLinksCount','migMissingCount'].forEach(id=>$(id).textContent='0');$('downloadMissingBtn')?.classList.add('hidden');lastMissingWorks=[];}
$('groupsJsonFile')?.addEventListener('change',()=>{resetMigrationCounters();$('groupsImportLog').textContent=$('groupsJsonFile').files?.[0]?`Arquivo selecionado: ${$('groupsJsonFile').files[0].name}`:'Aguardando o arquivo grupos_obras.json.';});
$('importGroupsWebBtn')?.addEventListener('click',async()=>{
  const file=$('groupsJsonFile').files?.[0];if(!file)return alert('Selecione o arquivo grupos_obras.json.');
  resetMigrationCounters();$('groupsImportProgress').value=10;$('groupsImportLog').textContent='Lendo e validando o arquivo...';
  try{
    const text=await file.text();let data;try{data=JSON.parse(text);}catch{throw new Error('O arquivo selecionado não é um JSON válido.');}
    $('groupsImportProgress').value=35;$('groupsImportLog').textContent+='\nEnviando os grupos para o Supabase...';
    const result=await apiAdmin('admin-import-groups',{method:'POST',body:JSON.stringify({data,replaceMissing:$('replaceGroupsImport').checked})});
    $('groupsImportProgress').value=100;
    $('migGroupsCount').textContent=result.groups||0;$('migSubgroupsCount').textContent=result.subgroups||0;$('migLinksCount').textContent=result.links||0;$('migMissingCount').textContent=result.missing?.length||0;
    lastMissingWorks=result.missing||[];$('downloadMissingBtn').classList.toggle('hidden',!lastMissingWorks.length);
    $('groupsImportLog').textContent+=`\nConcluído.\nGrupos processados: ${result.groups||0}\nCriados: ${result.created||0}\nAtualizados: ${result.updated||0}\nSubgrupos: ${result.subgroups||0}\nVínculos de obras: ${result.links||0}\nObras não encontradas: ${lastMissingWorks.length}`;
    await loadGroups();await refreshAll();
  }catch(e){$('groupsImportProgress').value=0;$('groupsImportLog').textContent+=`\nERRO: ${e.message}`;alert(e.message);}
});
$('downloadMissingBtn')?.addEventListener('click',()=>{
  if(!lastMissingWorks.length)return;const rows=[['Grupo','OPUS','Contrato'],...lastMissingWorks.map(x=>[x.grupo,x.opus,x.contrato])];
  const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='obras_nao_encontradas_grupos.csv';a.click();URL.revokeObjectURL(a.href);
});
