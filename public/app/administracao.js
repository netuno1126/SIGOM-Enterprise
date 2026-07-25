const cfg=window.SIGOM_CONFIG;
const db=supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const state={session:null,profile:null,pending:null};
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const norm=s=>String(s??'').normalize('NFKC').trim();
const key=s=>norm(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const num=v=>{if(typeof v==='number')return Number.isFinite(v)?v:null;const s=norm(v).replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.').replace('%','');const n=Number(s);return Number.isFinite(n)?n:null};
const fmtDate=v=>v?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'—';
const esc=v=>norm(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function boot(){
  const {data:{session}}=await db.auth.getSession();if(!session)return parent.location.replace('/');state.session=session;
  const {data:profile,error}=await db.from('profiles').select('nome,perfil,ativo').eq('id',session.user.id).maybeSingle();
  if(error)throw error;state.profile=profile||{perfil:'consulta',ativo:true};
  $('#sessionUser').textContent=profile?.nome||session.user.email;$('#profileBadge').textContent=`Perfil: ${state.profile.perfil}`;
  const canWrite=['administrador','editor'].includes(state.profile.perfil)&&state.profile.ativo!==false;
  document.body.classList.toggle('read-only',!canWrite);$('#accessDenied').classList.toggle('hidden',canWrite);
  $$('[data-import],#validateGroups,#commitImport').forEach(b=>b.disabled=!canWrite);
  if(state.profile.perfil!=='administrador')$$('.admin-only').forEach(e=>e.classList.add('hidden'));
  bind();await loadHistory();if(state.profile.perfil==='administrador'){await loadUsers();await loadAudit()}
}

function bind(){
  $$('.tab').forEach(b=>b.onclick=()=>{if(b.classList.contains('hidden'))return;$$('.tab').forEach(x=>x.classList.remove('active'));$$('.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(`[data-panel="${b.dataset.tab}"]`).classList.add('active')});
  $$('[data-import]').forEach(b=>b.onclick=()=>validateSpreadsheet(b.dataset.import));
  $('#cancelImport').onclick=clearPreview;$('#commitImport').onclick=commitImport;$('#downloadTemplate').onclick=downloadTemplate;
  $('#validateGroups').onclick=importGroups;$('#refreshHistory').onclick=loadHistory;$('#refreshUsers').onclick=loadUsers;$('#refreshAudit').onclick=loadAudit;
  $('#createUserForm').onsubmit=createUser;
  window.addEventListener('message',e=>{if(e.data?.type==='SIGOM_REFRESH_HISTORY')loadHistory()});
}

function inputFor(type){return {obras:'#fileObras',portfolio:'#filePortfolio',saldos:'#fileSaldos',objetivos:'#fileObjetivos'}[type]}
async function readSheet(file){const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];return XLSX.utils.sheet_to_json(ws,{defval:'',raw:false,dateNF:'dd/mm/yyyy'})}
function get(row,names){const map=Object.fromEntries(Object.entries(row).map(([k,v])=>[key(k),v]));for(const n of names){const v=map[key(n)];if(v!==undefined&&norm(v)!=='')return v}return ''}
function isoDate(v){if(v instanceof Date&&!Number.isNaN(v.valueOf()))return v.toISOString().slice(0,10);const s=norm(v);if(!s)return null;let m=s.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/);if(m)return `${m[3]}-${m[2]}-${m[1]}`;m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:null}
function intNum(v){const n=num(v);return n===null?null:Math.round(n)}
function mapObra(r){
  const opus=norm(get(r,['Nr Solicitação','Nr OPUS','Nº OPUS','OPUS','Nr. OPUS']));
  const contrato=norm(get(r,['Nr Contrato','Contrato','Nº Contrato']));
  const descricao=norm(get(r,['Descrição Solicitação','Descrição','Concepção do Objeto','Objeto']));
  const totalNotas=num(get(r,['Total Notas Fiscais','Total NF','Executado','EXECUTADO']));
  return {
    opus,contrato,nr_solicitacao:opus,nr_contrato:contrato,
    rm:norm(get(r,['RM','Região Militar'])),
    contratante:norm(get(r,['Contratante','CRO','GPT'])),
    om_beneficiada:norm(get(r,['OM Beneficiada','OM'])),
    empresa:norm(get(r,['Empresa','Contratada'])),
    descricao,descricao_solicitacao:descricao,nome_obra:descricao,
    percentual_estimado:num(get(r,['% estimado','% Estimado','Percentual Estimado'])),
    percentual_medido:num(get(r,['% medido','% Medido','Percentual Medido'])),
    valor_solicitacao:num(get(r,['Valor Solicitação'])),
    valor_contratado:num(get(r,['Valor Contratado'])),
    acoes_financeiras:norm(get(r,['Ações Financeiras'])),
    inicio_os:isoDate(get(r,['Início (OS)','Início da Obra'])),
    fim_prazo:isoDate(get(r,['Fim Prazo'])),
    fim_vigencia:isoDate(get(r,['Fim Vigência'])),
    percentual_quarta:num(get(r,['% Quarta'])),data_quarta:isoDate(get(r,['Data quarta'])),
    percentual_antepenultima:num(get(r,['% Antepenúltima'])),data_antepenultima:isoDate(get(r,['Data Antepenúltima'])),
    percentual_penultima:num(get(r,['% Penúltima'])),data_penultima:isoDate(get(r,['Data Penúltima'])),
    percentual_ultima:num(get(r,['% Última'])),data_ultima:isoDate(get(r,['Data Última'])),
    valor_inicial:num(get(r,['Valor Inicial'])),valor_aditivado:num(get(r,['Valor Aditivado'])),
    valor_apostilado:num(get(r,['Valor Apostilado'])),valor_atual:num(get(r,['Valor Atual','Valor Total','VALOR TOTAL'])),
    total_nc:num(get(r,['Total NC'])),total_ne:num(get(r,['Total NE','Empenho','EMPENHO'])),
    percentual_empenhado:num(get(r,['% Empenhado'])),falta_empenhar:num(get(r,['Falta Empenhar'])),
    total_nf:totalNotas,total_notas_fiscais:totalNotas,
    prazo_contratado:intNum(get(r,['Prazo Contratado'])),prazo_aditivo:intNum(get(r,['Prazo Aditivo'])),prazo_total:intNum(get(r,['Prazo Total'])),
    vigencia_contratado:intNum(get(r,['Vigência Contratado'])),vigencia_aditivado:intNum(get(r,['Vigência Aditivado'])),vigencia_total:intNum(get(r,['Vigência Total'])),
    termino_vigencia:isoDate(get(r,['Término de Vigência'])),saldo_descentralizar:num(get(r,['Saldo a Descentralizar'])),
    acao_orcamentaria:norm(get(r,['Ação Orçamentaria','Ação Orçamentária'])),idp:num(get(r,['IDP'])),
    data_projetada:isoDate(get(r,['data projetada','Data Projetada'])),obs:norm(get(r,['obs','Observações'])),
    dias_atrasados:intNum(get(r,['dias atrasados'])),percentual_atraso:num(get(r,['% atraso'])),
    media_medicao_3:num(get(r,['media medicao 3'])),media_mensal_global:num(get(r,['media mensal global'])),
    analise:norm(get(r,['analise','Análise'])),media_90_dias:num(get(r,['media 90 dias'])),saldo_empenho:num(get(r,['saldo de empenho'])),
    dados:r,dados_origem:r
  }
}
function mapSaldo(r){return {om:norm(get(r,['OM','Organização Militar'])),ano:Number(get(r,['Ano','Exercício'])),valor:num(get(r,['Valor','Saldo','Saldo Alongado']))||0}}
function mapObjetivo(r){const objetivo=norm(get(r,['Objetivo','Meta'])),opus=norm(get(r,['Nr OPUS','OPUS'])),contrato=norm(get(r,['Contrato']));return {chave:norm(get(r,['Chave','Nr Solicitação']))||[objetivo,opus,contrato].join('|'),objetivo,opus,contrato,situacao:norm(get(r,['Situação','Status'])),observacao:norm(get(r,['Observação','Observações'])),auditado:/^(sim|true|1)$/i.test(norm(get(r,['Auditado'])))}}

async function validateSpreadsheet(type){
  const file=$(inputFor(type)).files[0];if(!file)return alert('Selecione um arquivo.');
  try{const raw=await readSheet(file);let rows=[];if(type==='obras'||type==='portfolio')rows=raw.map(mapObra);if(type==='saldos')rows=raw.map(mapSaldo);if(type==='objetivos')rows=raw.map(mapObjetivo);
    const errors=[];rows.forEach((r,i)=>{if((type==='obras'||type==='portfolio')&&!r.opus)errors.push(`Linha ${i+2}: Nº OPUS ausente.`);if(type==='saldos'&&(!r.om||!r.ano))errors.push(`Linha ${i+2}: OM ou ano ausente.`);if(type==='objetivos'&&!r.chave)errors.push(`Linha ${i+2}: chave ausente.`)});
    state.pending={type,file,rows:rows.filter((r,i)=>!errors.some(e=>e.startsWith(`Linha ${i+2}:`))),errors};renderPreview();
  }catch(e){alert(`Não foi possível ler o arquivo: ${e.message}`)}
}
function renderPreview(){const p=state.pending;$('#previewBox').classList.remove('hidden');$('#previewSummary').textContent=`${p.file.name} · ${p.rows.length} registros válidos · ${p.errors.length} inconsistências`;
  $('#validationMessages').innerHTML=p.errors.length?`<div class="alert warning"><strong>Inconsistências:</strong><br>${p.errors.slice(0,20).map(esc).join('<br>')}${p.errors.length>20?'<br>…':''}</div>`:'<div class="alert success">Validação concluída sem inconsistências obrigatórias.</div>';
  const sample=p.rows.slice(0,20),cols=[...new Set(sample.flatMap(r=>Object.keys(r).filter(k=>k!=='dados')))].slice(0,12);$('#previewHead').innerHTML=`<tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr>`;$('#previewBody').innerHTML=sample.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}
function clearPreview(){state.pending=null;$('#previewBox').classList.add('hidden')}
function setProgress(done,total,text){$('#progressBox').classList.remove('hidden');$('#progressBar').style.width=`${total?Math.round(done/total*100):0}%`;$('#progressText').textContent=text}
async function commitImport(){const p=state.pending;if(!p||!p.rows.length)return;const table={obras:'obras',portfolio:'portfolio_obras',saldos:'saldos_alongados',objetivos:'objetivos_auditoria'}[p.type];
  const {data:imp,error:ie}=await db.from('importacoes_planilha').insert({nome_arquivo:p.file.name,tamanho_bytes:p.file.size,linhas_lidas:p.rows.length+p.errors.length,status:'processando',detalhes:{tipo:p.type,erros_validacao:p.errors},importado_por:state.session.user.id}).select('id').single();if(ie)return alert(ie.message);
  let ok=0,fail=0,details=[];const batch=100;for(let i=0;i<p.rows.length;i+=batch){const chunk=p.rows.slice(i,i+batch).map(r=>({...r,atualizado_por:state.session.user.id,...((p.type==='obras')?{origem_importacao_id:imp.id}:{})}));
    const conflict=p.type==='saldos'?'om,ano':p.type==='objetivos'?'chave':'opus,contrato';const {error}=await db.from(table).upsert(chunk,{onConflict:conflict});if(error){fail+=chunk.length;details.push({inicio:i+1,erro:error.message})}else ok+=chunk.length;setProgress(Math.min(i+batch,p.rows.length),p.rows.length,`Processados ${Math.min(i+batch,p.rows.length)} de ${p.rows.length}`)}
  await db.from('importacoes_planilha').update({obras_processadas:ok,obras_com_erro:fail,status:fail?'concluida_com_erros':'concluida',detalhes:{tipo:p.type,erros_validacao:p.errors,lotes_com_erro:details},concluido_em:new Date().toISOString()}).eq('id',imp.id);
  setProgress(p.rows.length,p.rows.length,`Concluído: ${ok} registros gravados; ${fail} erros.`);clearPreview();await loadHistory();
}
function downloadTemplate(){const csv='RM;Contratante;OM Beneficiada;Nr Contrato;Nr Solicitação;Empresa;Descrição Solicitação;% estimado;% medido;Valor Solicitação;Valor Contratado;Ações Financeiras;Início (OS);Fim Prazo;Fim Vigência;% Quarta;Data quarta;% Antepenúltima;Data Antepenúltima;% Penúltima;Data Penúltima;% Última;Data Última;Valor Inicial;Valor Aditivado;Valor Apostilado;Valor Atual;Total NC;Total NE;% Empenhado;Falta Empenhar;Total Notas Fiscais;Prazo Contratado;Prazo Aditivo;Prazo Total;Vigência Contratado;Vigência Aditivado;Vigência Total;Término de Vigência;Saldo a Descentralizar;Ação Orçamentaria;IDP;data projetada;obs;dias atrasados;% atraso;media medicao 3;media mensal global;analise;media 90 dias;saldo de empenho\n';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='modelo_importacao_obras_sigom.csv';a.click();URL.revokeObjectURL(a.href)}

async function importGroups(){const file=$('#fileGroups').files[0];if(!file)return alert('Selecione o JSON.');let src;try{src=JSON.parse(await file.text())}catch(e){return alert('JSON inválido.')};const groups=Array.isArray(src)?src:(src.grupos||[]);let created=0,links=0,missing=[];
  for(const g0 of groups){const nome=norm(g0.nome||g0.name);if(!nome)continue;let {data:g}=await db.from('grupos').select('id').eq('nome',nome).maybeSingle();if(!g){const res=await db.from('grupos').insert({nome,descricao:norm(g0.descricao),criado_por:state.session.user.id,atualizado_por:state.session.user.id}).select('id').single();if(res.error){missing.push(`${nome}: ${res.error.message}`);continue}g=res.data;created++}
    const obras=g0.obras||g0.items||[];for(const o of obras){const opus=norm(o.opus||o.nr_opus||o['Nr OPUS']||o);const contrato=norm(o.contrato||'');let q=db.from('obras').select('id').eq('opus',opus);if(contrato)q=q.eq('contrato',contrato);const {data:obra}=await q.limit(1).maybeSingle();if(!obra){missing.push(`${nome}: ${opus}${contrato?' | '+contrato:''}`);continue}const {error}=await db.from('grupo_obras').upsert({grupo_id:g.id,obra_id:obra.id,adicionado_por:state.session.user.id},{onConflict:'grupo_id,obra_id'});if(!error)links++}}
  $('#groupsResult').textContent=`Grupos criados: ${created}\nVínculos processados: ${links}\nNão encontrados/erros: ${missing.length}\n\n${missing.slice(0,100).join('\n')}`}

async function authHeader(){const {data:{session}}=await db.auth.getSession();return {'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`}}
async function adminCall(action,payload={}){const r=await fetch('/.netlify/functions/admin-users',{method:'POST',headers:await authHeader(),body:JSON.stringify({action,...payload})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Falha administrativa');return j}
async function loadUsers(){if(state.profile?.perfil!=='administrador')return;try{const {users}=await adminCall('list');$('#usersBody').innerHTML=users.map(u=>`<tr class="${u.ativo?'':'inactive'}"><td><strong>${esc(u.nome||u.email)}</strong><br><small>${esc(u.email)}</small></td><td><select data-user-profile="${u.id}">${['consulta','editor','auditor','administrador'].map(p=>`<option ${p===u.perfil?'selected':''}>${p}</option>`).join('')}</select></td><td>${u.ativo?'Sim':'Não'}</td><td><button class="mini-btn" data-save-user="${u.id}">Salvar</button> <button class="mini-btn secondary" data-toggle-user="${u.id}" data-active="${u.ativo}">${u.ativo?'Desativar':'Ativar'}</button></td></tr>`).join('');
  $$('[data-save-user]').forEach(b=>b.onclick=async()=>{await adminCall('update',{userId:b.dataset.saveUser,perfil:$(`[data-user-profile="${b.dataset.saveUser}"]`).value});await loadUsers()});$$('[data-toggle-user]').forEach(b=>b.onclick=async()=>{await adminCall('update',{userId:b.dataset.toggleUser,ativo:b.dataset.active!=='true'});await loadUsers()})}catch(e){$('#usersBody').innerHTML=`<tr><td colspan="4">${esc(e.message)}</td></tr>`}}
async function createUser(e){e.preventDefault();const f=new FormData(e.target);try{await adminCall('create',{nome:f.get('nome'),email:f.get('email'),password:f.get('password'),perfil:f.get('perfil')});$('#createUserStatus').textContent='Usuário criado com sucesso.';e.target.reset();await loadUsers()}catch(err){$('#createUserStatus').textContent=err.message}}
async function loadHistory(){const {data,error}=await db.from('importacoes_planilha').select('*').order('importado_em',{ascending:false}).limit(100);$('#historyBody').innerHTML=error?`<tr><td colspan="6">${esc(error.message)}</td></tr>`:(data||[]).map(x=>`<tr><td>${fmtDate(x.importado_em)}</td><td>${esc(x.nome_arquivo)}</td><td>${esc(x.status)}</td><td>${x.linhas_lidas}</td><td>${x.obras_processadas}</td><td>${x.obras_com_erro}</td></tr>`).join('')}
async function loadAudit(){if(state.profile?.perfil!=='administrador')return;const {data,error}=await db.from('auditoria_logs').select('*').order('criado_em',{ascending:false}).limit(200);$('#auditBody').innerHTML=error?`<tr><td colspan="5">${esc(error.message)}</td></tr>`:(data||[]).map(x=>`<tr><td>${fmtDate(x.criado_em)}</td><td>${esc(x.acao)}</td><td>${esc(x.entidade)}</td><td>${esc(x.entidade_id)}</td><td>${esc(x.usuario_id)}</td></tr>`).join('')}
boot().catch(e=>{console.error(e);$('#accessDenied').classList.remove('hidden');$('#accessDenied').textContent=`Falha ao inicializar: ${e.message}`});
