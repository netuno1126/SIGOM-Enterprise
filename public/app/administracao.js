const cfg=window.SIGOM_CONFIG;
const db=supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const state={session:null,profile:null,pending:null,lastImportErrors:[]};
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const norm=s=>String(s??'').normalize('NFKC').trim();
const key=s=>norm(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const num=v=>{if(typeof v==='number')return Number.isFinite(v)?v:null;let s=norm(v).replace(/R\$|\s|%/g,'');if(!s)return null;if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');else if(s.includes(','))s=s.replace(',','.');const n=Number(s);return Number.isFinite(n)?n:null};
const percentual=v=>{const original=norm(v);let n=num(v);if(n===null)return null;/* Valores com % já estão na escala exibida. Frações sem sinal (0,0307) viram 3,07. Nunca multiplica 3,07 para 307. */if(!/%/.test(original)&&Math.abs(n)>0&&Math.abs(n)<=1)n*=100;return n};
const fmtDate=v=>v?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'—';
const esc=v=>norm(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function boot(){
  const {data:{session}}=await db.auth.getSession();if(!session)return parent.location.replace('/');state.session=session;
  const {data:profile,error}=await db.from('profiles').select('nome,username,perfil,ativo').eq('id',session.user.id).maybeSingle();
  if(error)throw error;state.profile=profile||{perfil:'consulta',ativo:true};
  $('#sessionUser').textContent=profile?.nome||session.user.email;$('#profileBadge').textContent=`Perfil: ${state.profile.perfil}`;
  const canWrite=['administrador','editor'].includes(state.profile.perfil)&&state.profile.ativo!==false;
  document.body.classList.toggle('read-only',!canWrite);$('#accessDenied').classList.toggle('hidden',canWrite);
  $$('[data-import],#validateGroups,#commitImport').forEach(b=>b.disabled=!canWrite);
  if(state.profile.perfil!=='administrador')$$('.admin-only').forEach(e=>e.classList.add('hidden'));
  bind();const requested=new URLSearchParams(location.search).get('tab');if(requested){const btn=document.querySelector(`.tab[data-tab="${requested}"]`);if(btn&&!btn.classList.contains('hidden'))btn.click();}await loadHistory();if(state.profile.perfil==='administrador'){await loadUsers();await loadAudit()}
}

function bind(){
  $$('.tab').forEach(b=>b.onclick=()=>{if(b.classList.contains('hidden'))return;$$('.tab').forEach(x=>x.classList.remove('active'));$$('.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(`[data-panel="${b.dataset.tab}"]`).classList.add('active')});
  $$('[data-import]').forEach(b=>b.onclick=()=>validateSpreadsheet(b.dataset.import));
  $('#cancelImport').onclick=clearPreview;$('#commitImport').onclick=commitImport;$('#downloadTemplate').onclick=downloadTemplate;
  $('#downloadImportErrors').onclick=downloadImportErrors;
  $('#validateGroups').onclick=importGroups;$('#btnExportGroups').onclick=exportGroups;$('#refreshHistory').onclick=loadHistory;$('#refreshUsers').onclick=loadUsers;$('#refreshAudit').onclick=loadAudit;
  $('#createUserForm').onsubmit=createUser;
  window.addEventListener('message',e=>{if(e.data?.type==='SIGOM_REFRESH_HISTORY')loadHistory()});
}

function inputFor(type){return {obras:'#fileObras',portfolio:'#filePortfolio',principais:'#filePrincipais',saldos:'#fileSaldos',objetivos:'#fileObjetivos'}[type]}
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
    percentual_estimado:percentual(get(r,['% estimado','% Estimado','Percentual Estimado'])),
    percentual_medido:percentual(get(r,['% medido','% Medido','Percentual Medido'])),
    valor_solicitacao:num(get(r,['Valor Solicitação'])),
    valor_contratado:num(get(r,['Valor Contratado'])),
    acoes_financeiras:norm(get(r,['Ações Financeiras'])),
    inicio_os:isoDate(get(r,['Início (OS)','Início da Obra'])),
    fim_prazo:isoDate(get(r,['Fim Prazo'])),
    fim_vigencia:isoDate(get(r,['Fim Vigência'])),
    percentual_quarta:percentual(get(r,['% Quarta'])),data_quarta:isoDate(get(r,['Data quarta'])),
    percentual_antepenultima:percentual(get(r,['% Antepenúltima'])),data_antepenultima:isoDate(get(r,['Data Antepenúltima'])),
    percentual_penultima:percentual(get(r,['% Penúltima'])),data_penultima:isoDate(get(r,['Data Penúltima'])),
    percentual_ultima:percentual(get(r,['% Última'])),data_ultima:isoDate(get(r,['Data Última'])),
    valor_inicial:num(get(r,['Valor Inicial'])),valor_aditivado:num(get(r,['Valor Aditivado'])),
    valor_apostilado:num(get(r,['Valor Apostilado'])),valor_atual:num(get(r,['Valor Atual','Valor Total','VALOR TOTAL'])),
    total_nc:num(get(r,['Total NC'])),total_ne:num(get(r,['Total NE','Empenho','EMPENHO'])),
    percentual_empenhado:percentual(get(r,['% Empenhado'])),falta_empenhar:num(get(r,['Falta Empenhar'])),
    total_nf:totalNotas,total_notas_fiscais:totalNotas,
    prazo_contratado:intNum(get(r,['Prazo Contratado'])),prazo_aditivo:intNum(get(r,['Prazo Aditivo'])),prazo_total:intNum(get(r,['Prazo Total'])),
    vigencia_contratado:intNum(get(r,['Vigência Contratado'])),vigencia_aditivado:intNum(get(r,['Vigência Aditivado'])),vigencia_total:intNum(get(r,['Vigência Total'])),
    termino_vigencia:isoDate(get(r,['Término de Vigência'])),saldo_descentralizar:num(get(r,['Saldo a Descentralizar'])),
    acao_orcamentaria:norm(get(r,['Ação Orçamentaria','Ação Orçamentária'])),idp:num(get(r,['IDP'])),
    data_projetada:isoDate(get(r,['data projetada','Data Projetada'])),obs:norm(get(r,['obs','Observações'])),
    dias_atrasados:intNum(get(r,['dias atrasados'])),percentual_atraso:percentual(get(r,['% atraso'])),
    media_medicao_3:num(get(r,['media medicao 3'])),media_mensal_global:num(get(r,['media mensal global'])),
    analise:norm(get(r,['analise','Análise'])),media_90_dias:num(get(r,['media 90 dias'])),saldo_empenho:num(get(r,['saldo de empenho'])),
    dados:r,dados_origem:r
  }
}
async function readPrincipais(file){
  const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];
  const grid=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false,dateNF:'dd/mm/yyyy'});
  const out=[];let categoria='';let ordem=0;let rmAtual='';
  for(const row of grid){const a=norm(row[0]),b=norm(row[1]),c=norm(row[2]);
    if(a==='OBRAS EM ANDAMENTO'||a==='FUTURAS OBRAS'){categoria=a;ordem=0;rmAtual='';continue}
    if(!categoria||a==='Nr Solicitação'||(!a&&!b&&!c))continue;
    if(c)rmAtual=c;ordem++;
    const nr=/^\d+$/.test(a)?a:'';const descricao=b;if(!descricao)continue;
    const chave=[categoria,nr||descricao,rmAtual].join('|');
    out.push({chave,categoria,nr_solicitacao:nr||null,descricao,rm:rmAtual||null,ordem,dados_origem:{'Nr Solicitação':nr,'Descrição':descricao,'RM':rmAtual}})
  }
  return out;
}
function mapSaldoConsolidado(r,indice=0){
  const om=norm(get(r,['OM','Organização Militar']));
  const out={om,dados_origem:r,ordem:indice+1,linha_tipo:/^TOTAL$/i.test(om)?'TOTAL':/^EB$/i.test(om)?'EB':/^TEREO$/i.test(om)?'TEREO':'OM'};
  let soma=0;for(let ano=2016;ano<=2026;ano++){const n=num(get(r,[String(ano)]));out[`saldo_${ano}`]=n??0;soma+=n??0}
  const informado=num(get(r,['total','Total']));out.total_informado=informado;out.total_calculado=soma;out.total=informado??soma;
  return out;
}
function saldoLongRows(r){const rows=[];for(let ano=2016;ano<=2026;ano++)rows.push({om:r.om,ano,valor:r[`saldo_${ano}`]||0,dados:r.dados_origem});return rows}


function consolidarPortfolio(rows){
  const by=new Map();
  for(const row of rows){
    const opus=norm(row.opus||row.nr_solicitacao).replace(/\D/g,'');
    if(!opus)continue;
    const contrato=norm(row.contrato||row.nr_contrato);
    const k=`${opus}|${contrato.toLowerCase().replace(/\s+/g,'')}`;
    const anterior=by.get(k)||{};
    by.set(k,{...anterior,...row,opus,nr_solicitacao:opus,contrato,nr_contrato:contrato});
  }
  return [...by.values()];
}
async function gravarPortfolioSemContrato(item){
  const opus=norm(item.opus||item.nr_solicitacao).replace(/\D/g,'');
  const payload={...item,opus,nr_solicitacao:opus,contrato:'',nr_contrato:''};
  const existente=await db.from('portfolio_obras').select('id').eq('opus',opus).or('contrato.is.null,contrato.eq.').limit(1).maybeSingle();
  if(existente.error) return {error:existente.error};
  if(existente.data?.id) return db.from('portfolio_obras').update(payload).eq('id',existente.data.id);
  return db.from('portfolio_obras').insert(payload);
}
function mapObjetivo(r){const objetivo=norm(get(r,['Objetivo','Meta'])),opus=norm(get(r,['Nr OPUS','OPUS'])),contrato=norm(get(r,['Contrato']));return {chave:norm(get(r,['Chave','Nr Solicitação']))||[objetivo,opus,contrato].join('|'),objetivo,opus,contrato,situacao:norm(get(r,['Situação','Status'])),observacao:norm(get(r,['Observação','Observações'])),auditado:/^(sim|true|1)$/i.test(norm(get(r,['Auditado'])))}}

async function validateSpreadsheet(type){
  const file=$(inputFor(type)).files[0];if(!file)return alert('Selecione um arquivo.');
  try{const raw=type==='principais'?null:await readSheet(file);let rows=[];if(type==='obras'||type==='portfolio')rows=raw.map(mapObra);if(type==='portfolio')rows=consolidarPortfolio(rows);if(type==='principais')rows=await readPrincipais(file);if(type==='saldos')rows=raw.map((r,i)=>mapSaldoConsolidado(r,i));if(type==='objetivos')rows=raw.map(mapObjetivo);
    const errors=[];rows.forEach((r,i)=>{if((type==='obras'||type==='portfolio')&&!r.opus)errors.push(`Linha ${i+2}: Nº OPUS ausente.`);if(type==='principais'&&(!r.categoria||!r.descricao))errors.push(`Registro ${i+1}: categoria ou descrição ausente.`);if(type==='saldos'&&!r.om)errors.push(`Linha ${i+2}: OM ausente.`);if(type==='objetivos'&&!r.chave)errors.push(`Linha ${i+2}: chave ausente.`)});
    state.pending={type,file,rows:rows.filter((r,i)=>!errors.some(e=>e.startsWith(`Linha ${i+2}:`))),errors};renderPreview();
  }catch(e){alert(`Não foi possível ler o arquivo: ${e.message}`)}
}
function renderPreview(){const p=state.pending;$('#previewBox').classList.remove('hidden');$('#previewSummary').textContent=`${p.file.name} · ${p.rows.length} registros válidos · ${p.errors.length} inconsistências${p.type==='portfolio'?' · contrato opcional; Nº OPUS é a chave mínima':''}`;
  $('#validationMessages').innerHTML=p.errors.length?`<div class="alert warning"><strong>Inconsistências:</strong><br>${p.errors.slice(0,20).map(esc).join('<br>')}${p.errors.length>20?'<br>…':''}</div>`:'<div class="alert success">Validação concluída sem inconsistências obrigatórias.</div>';
  const sample=p.rows.slice(0,20),cols=[...new Set(sample.flatMap(r=>Object.keys(r).filter(k=>k!=='dados')))].slice(0,12);$('#previewHead').innerHTML=`<tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr>`;$('#previewBody').innerHTML=sample.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}
function clearPreview(){state.pending=null;$('#previewBox').classList.add('hidden')}
function setProgress(done,total,text){$('#progressBox').classList.remove('hidden');$('#progressBar').style.width=`${total?Math.round(done/total*100):0}%`;$('#progressText').textContent=text}
async function commitImport(){
  const p=state.pending;if(!p||!p.rows.length)return;
  const table={obras:'obras',portfolio:'portfolio_obras',principais:'principais_obras',saldos:'saldos_alongados_consolidado',objetivos:'objetivos_auditoria'}[p.type];
  const {data:imp,error:ie}=await db.from('importacoes_planilha').insert({nome_arquivo:p.file.name,tamanho_bytes:p.file.size,linhas_lidas:p.rows.length+p.errors.length,status:'processando',detalhes:{tipo:p.type,erros_validacao:p.errors},importado_por:state.session.user.id}).select('id').single();
  if(ie)return alert(ie.message);

  let ok=0,fail=0,details=[];const batch=100;
  // portfolio_obras já possui o índice histórico completo (opus, contrato).
  // A chave nr_solicitacao,nr_contrato foi criada inicialmente como índice
  // parcial e não pode ser usada de forma confiável pelo PostgREST ON CONFLICT.
  const conflict=p.type==='saldos'?'om':p.type==='principais'?'chave':p.type==='objetivos'?'chave':p.type==='portfolio'?'opus,contrato':'opus,contrato';

  const preparar=(r)=>({...r,atualizado_por:state.session.user.id,...((p.type==='obras')?{origem_importacao_id:imp.id}:{})});
  const chaveLinha=(r)=>p.type==='portfolio'||p.type==='obras'?`${r.opus||r.nr_solicitacao||'?'} | ${r.contrato||r.nr_contrato||''}`:p.type==='saldos'?(r.om||'?'):(r.chave||'?');

  for(let i=0;i<p.rows.length;i+=batch){
    const chunk=p.rows.slice(i,i+batch).map(preparar);
    const comContrato=p.type==='portfolio'?chunk.filter(x=>norm(x.contrato||x.nr_contrato)!==''):chunk;
    const semContrato=p.type==='portfolio'?chunk.filter(x=>norm(x.contrato||x.nr_contrato)===''):[];
    const batchResult=comContrato.length?await db.from(table).upsert(comContrato,{onConflict:conflict}):{error:null};
    let errosSemContrato=[];
    for(const item of semContrato){const r=await gravarPortfolioSemContrato(item);if(r.error)errosSemContrato.push({item,error:r.error})}
    if(errosSemContrato.length&&!batchResult.error)batchResult.error=errosSemContrato[0].error;
    if(!batchResult.error){
      ok+=chunk.length;
      if(p.type==='saldos'){
        const longRows=chunk.flatMap(saldoLongRows).map(r=>({...r,atualizado_por:state.session.user.id}));
        const lr=await db.from('saldos_alongados').upsert(longRows,{onConflict:'om,ano'});
        if(lr.error)details.push({linha:`lote ${i+1}`,chave:'saldos anuais',erro:lr.error.message});
      }
    }else{
      // Um único registro inválido não deve reprovar as outras 99 linhas. Faz a
      // repetição individual para gravar as válidas e identificar o erro exato.
      for(let j=0;j<chunk.length;j++){
        const item=chunk[j];
        const one=(p.type==='portfolio'&&norm(item.contrato||item.nr_contrato)==='')?await gravarPortfolioSemContrato(item):await db.from(table).upsert(item,{onConflict:conflict});
        if(one.error){
          fail++;
          details.push({linha:i+j+2,chave:chaveLinha(item),erro:one.error.message,codigo:one.error.code||''});
        }else{
          ok++;
          if(p.type==='saldos'){
            const lr=await db.from('saldos_alongados').upsert(saldoLongRows(item).map(r=>({...r,atualizado_por:state.session.user.id})),{onConflict:'om,ano'});
            if(lr.error)details.push({linha:i+j+2,chave:item.om,erro:`Detalhamento anual: ${lr.error.message}`,codigo:lr.error.code||''});
          }
        }
      }
    }
    setProgress(Math.min(i+batch,p.rows.length),p.rows.length,`Processados ${Math.min(i+batch,p.rows.length)} de ${p.rows.length}`);
  }

  // Confirma que os registros são realmente visíveis após o upsert. Isso detecta
  // de imediato problemas de RLS, chave de conflito ou gravação apenas temporária.
  let verificacao=null;
  if(p.type==='portfolio'){
    const vr=await db.from('portfolio_obras').select('id',{count:'exact',head:true});
    verificacao={tabela:'portfolio_obras',registros_visiveis:vr.count??0,erro:vr.error?.message||null};
    if(vr.error)details.push({linha:'verificação',chave:'portfolio_obras',erro:vr.error.message,codigo:vr.error.code||''});
  }
  if(p.type==='saldos'){
    const [vc,vl]=await Promise.all([
      db.from('saldos_alongados_consolidado').select('id',{count:'exact',head:true}),
      db.from('saldos_alongados').select('id',{count:'exact',head:true})
    ]);
    verificacao={
      tabela:'saldos_alongados_consolidado',
      registros_visiveis:vc.count??0,
      registros_anuais_visiveis:vl.count??0,
      erro:vc.error?.message||vl.error?.message||null
    };
    if(vc.error)details.push({linha:'verificação',chave:'saldos_alongados_consolidado',erro:vc.error.message,codigo:vc.error.code||''});
    if(vl.error)details.push({linha:'verificação',chave:'saldos_alongados',erro:vl.error.message,codigo:vl.error.code||''});
    if(!vc.error && (vc.count??0)===0 && ok>0){
      fail+=ok;ok=0;
      details.push({linha:'verificação',chave:'saldos_alongados_consolidado',erro:'A importação foi processada, mas nenhum registro ficou visível no banco. Execute a migration 22 e confira as políticas RLS.',codigo:'PERSISTENCIA'});
    }
  }

  state.lastImportErrors=details;
  await db.from('importacoes_planilha').update({obras_processadas:ok,obras_com_erro:fail,status:fail?'concluida_com_erros':'concluida',detalhes:{tipo:p.type,erros_validacao:p.errors,lotes_com_erro:details,verificacao},concluido_em:new Date().toISOString()}).eq('id',imp.id);

  const detalhe=$('#importErrorDetails'),acoes=$('#importErrorActions');
  if(details.length){
    detalhe.classList.remove('hidden');acoes.classList.remove('hidden');
    detalhe.textContent=details.slice(0,100).map(x=>`Linha ${x.linha} · ${x.chave}\n${x.codigo?`[${x.codigo}] `:''}${x.erro}`).join('\n\n');
  }else{
    detalhe.classList.add('hidden');acoes.classList.add('hidden');detalhe.textContent='';
  }
  const complemento=verificacao?(p.type==='saldos'?` · ${verificacao.registros_visiveis} linha(s) consolidada(s) e ${verificacao.registros_anuais_visiveis} linha(s) anual(is) visível(is) no Supabase`:` · ${verificacao.registros_visiveis} registro(s) visível(is) em portfolio_obras`):'';
  setProgress(p.rows.length,p.rows.length,`Concluído: ${ok} registros gravados; ${fail} erros${complemento}.`);
  clearPreview();await loadHistory();
  if(p.type==='saldos'&&!fail){
    try{window.parent?.postMessage({type:'SIGOM_SALDOS_ATUALIZADOS'},location.origin)}catch(_e){}
  }
}

function downloadImportErrors(){
  const rows=state.lastImportErrors||[];if(!rows.length)return alert('Não há erros registrados na última importação.');
  const cab='linha;chave;codigo;erro\n';
  const csv=cab+rows.map(r=>[r.linha,r.chave,r.codigo||'',r.erro].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='SIGOM_erros_importacao.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function downloadTemplate(){const csv='RM;Contratante;OM Beneficiada;Nr Contrato;Nr Solicitação;Empresa;Descrição Solicitação;% estimado;% medido;Valor Solicitação;Valor Contratado;Ações Financeiras;Início (OS);Fim Prazo;Fim Vigência;% Quarta;Data quarta;% Antepenúltima;Data Antepenúltima;% Penúltima;Data Penúltima;% Última;Data Última;Valor Inicial;Valor Aditivado;Valor Apostilado;Valor Atual;Total NC;Total NE;% Empenhado;Falta Empenhar;Total Notas Fiscais;Prazo Contratado;Prazo Aditivo;Prazo Total;Vigência Contratado;Vigência Aditivado;Vigência Total;Término de Vigência;Saldo a Descentralizar;Ação Orçamentaria;IDP;data projetada;obs;dias atrasados;% atraso;media medicao 3;media mensal global;analise;media 90 dias;saldo de empenho\n';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='modelo_importacao_obras_sigom.csv';a.click();URL.revokeObjectURL(a.href)}

async function importGroups(){const file=$('#fileGroups').files[0];if(!file)return alert('Selecione o JSON.');let src;try{src=JSON.parse(await file.text())}catch(e){return alert('JSON inválido.')};const groups=Array.isArray(src)?src:(src.grupos||[]);let created=0,links=0,missing=[];
  for(const g0 of groups){const nome=norm(g0.nome||g0.name);if(!nome)continue;let {data:g}=await db.from('grupos').select('id').eq('nome',nome).maybeSingle();if(!g){const res=await db.from('grupos').insert({nome,descricao:norm(g0.descricao),criado_por:state.session.user.id,atualizado_por:state.session.user.id}).select('id').single();if(res.error){missing.push(`${nome}: ${res.error.message}`);continue}g=res.data;created++}
    const obras=g0.obras||g0.items||[];for(const o of obras){let opus='',contrato='';if(o&&typeof o==='object'){opus=norm(o.opus||o.nr_opus||o['Nr OPUS']||o['Nr Solicitação']);contrato=norm(o.contrato||o['Nr Contrato'])}else{const raw=norm(o);const pos=raw.indexOf('|');opus=pos>=0?raw.slice(0,pos):raw;contrato=pos>=0?raw.slice(pos+1):''}opus=String(opus).replace(/\D/g,'');let q=db.from('obras').select('id,opus,contrato,nr_solicitacao,nr_contrato').or(`opus.eq.${opus},nr_solicitacao.eq.${opus}`);const {data:cands,error:qerr}=await q.limit(20);if(qerr){missing.push(`${nome}: ${qerr.message}`);continue}const normC=v=>String(v||'').toLowerCase().replace(/\s+/g,'');const obra=(cands||[]).find(x=>!contrato||normC(x.contrato||x.nr_contrato)===normC(contrato))||(cands||[])[0];if(!obra){missing.push(`${nome}: ${opus}${contrato?' | '+contrato:''}`);continue}const {error}=await db.from('grupo_obras').upsert({grupo_id:g.id,obra_id:obra.id,adicionado_por:state.session.user.id},{onConflict:'grupo_id,obra_id'});if(!error)links++}}
  $('#groupsResult').textContent=`Grupos criados: ${created}\nVínculos processados: ${links}\nNão encontrados/erros: ${missing.length}\n\n${missing.slice(0,100).join('\n')}`}


async function exportGroups(){
  const [{data:groups,error:ge},{data:links,error:le},{data:obras,error:oe}]=await Promise.all([
    db.from('grupos').select('*').order('nome'),
    db.from('grupo_obras').select('*'),
    db.from('obras').select('id,opus,contrato,nr_solicitacao,nr_contrato')
  ]);
  if(ge||le||oe)return alert((ge||le||oe).message);
  const om=new Map((obras||[]).map(o=>[String(o.id),`${o.nr_solicitacao||o.opus||''}|${o.nr_contrato||o.contrato||''}`]));
  const by=new Map((groups||[]).map(g=>[String(g.id),{nome:g.nome,descricao:g.descricao||'',criadoEm:g.criado_em||'',criadoPor:g.criado_por||'',criador:g.criador||'',obras:[],subgrupos:{},arquivado:!!g.arquivado,arquivadoEm:g.arquivado_em||''}]));
  (links||[]).forEach(l=>{const g=by.get(String(l.grupo_id)),k=om.get(String(l.obra_id));if(g&&k)g.obras.push(k)});
  const payload={config:{permitirAuditorExcluir:false,permitirUsuarioCriarGrupo:true},usuario:state.session?.user?.email||'',perfil:state.profile?.perfil||'',atualizadoEm:new Date().toISOString(),grupos:[...by.values()]};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}));a.download='grupos_obras.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

async function authHeader(){const {data:{session}}=await db.auth.getSession();return {'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`}}
async function adminCall(action,payload={}){
  const r=await fetch('/.netlify/functions/admin-users',{
    method:'POST',
    headers:await authHeader(),
    body:JSON.stringify({action,...payload})
  });
  const raw=await r.text();
  let j={};
  if(raw.trim()){
    try{j=JSON.parse(raw)}catch{throw new Error(`Resposta inválida da função administrativa (HTTP ${r.status}).`)}
  }
  if(!r.ok)throw new Error(j.error||`Falha administrativa (HTTP ${r.status}).`);
  return j;
}
async function loadUsers(){
  if(state.profile?.perfil!=='administrador')return;
  try{
    const {users}=await adminCall('list');
    $('#usersBody').innerHTML=users.map(u=>`<tr class="${u.ativo?'':'inactive'}" data-user-row="${u.id}">
      <td>
        <div data-user-display="${u.id}"><strong>${esc(u.nome||u.username||u.email)}</strong>${u.username?`<br><small>@${esc(u.username)}</small>`:''}<br><small>${esc(u.email)}</small></div>
        <div class="user-edit-fields hidden" data-user-editor="${u.id}">
          <label>Nome completo<input data-user-name="${u.id}" value="${esc(u.nome||'')}"></label>
          <label>Nome de usuário<input data-user-username="${u.id}" value="${esc(u.username||'')}" minlength="3" maxlength="40" pattern="[A-Za-z0-9._-]+"></label>
          <label>E-mail<input data-user-email="${u.id}" type="email" value="${esc(u.email||'')}"></label>
        </div>
      </td>
      <td><select data-user-profile="${u.id}" disabled>${['consulta','editor','auditor','administrador'].map(p=>`<option ${p===u.perfil?'selected':''}>${p}</option>`).join('')}</select></td>
      <td>${u.ativo?'Sim':'Não'}</td>
      <td class="user-actions">
        <button class="mini-btn secondary" data-edit-user="${u.id}">Editar</button>
        <button class="mini-btn hidden" data-save-user="${u.id}">Salvar</button>
        <button class="mini-btn secondary" data-toggle-user="${u.id}" data-active="${u.ativo}">${u.ativo?'Desativar':'Ativar'}</button>
      </td>
    </tr>`).join('');

    $$('[data-edit-user]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.editUser;
      $(`[data-user-display="${id}"]`).classList.add('hidden');
      $(`[data-user-editor="${id}"]`).classList.remove('hidden');
      $(`[data-user-profile="${id}"]`).disabled=false;
      $(`[data-save-user="${id}"]`).classList.remove('hidden');
      b.classList.add('hidden');
    });

    $$('[data-save-user]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.saveUser;
      b.disabled=true;
      try{
        await adminCall('update',{
          userId:id,
          nome:$(`[data-user-name="${id}"]`).value,
          username:$(`[data-user-username="${id}"]`).value,
          email:$(`[data-user-email="${id}"]`).value,
          perfil:$(`[data-user-profile="${id}"]`).value
        });
        await loadUsers();
      }catch(e){alert(e.message);b.disabled=false}
    });

    $$('[data-toggle-user]').forEach(b=>b.onclick=async()=>{await adminCall('update',{userId:b.dataset.toggleUser,ativo:b.dataset.active!=='true'});await loadUsers()});
  }catch(e){$('#usersBody').innerHTML=`<tr><td colspan="4">${esc(e.message)}</td></tr>`}
}
async function createUser(e){
  e.preventDefault();
  const f=new FormData(e.target);
  try{
    await adminCall('create',{nome:f.get('nome'),username:f.get('username'),email:f.get('email'),password:f.get('password'),perfil:f.get('perfil')});
    $('#createUserStatus').textContent='Usuário criado com sucesso. Ele poderá entrar com o e-mail ou com @'+f.get('username')+'.';
    e.target.reset();
    await loadUsers();
  }catch(err){$('#createUserStatus').textContent=err.message}
}
async function loadHistory(){const {data,error}=await db.from('importacoes_planilha').select('*').order('importado_em',{ascending:false}).limit(100);$('#historyBody').innerHTML=error?`<tr><td colspan="6">${esc(error.message)}</td></tr>`:(data||[]).map(x=>`<tr><td>${fmtDate(x.importado_em)}</td><td>${esc(x.nome_arquivo)}</td><td>${esc(x.status)}</td><td>${x.linhas_lidas}</td><td>${x.obras_processadas}</td><td>${x.obras_com_erro}</td></tr>`).join('')}
async function loadAudit(){if(state.profile?.perfil!=='administrador')return;const {data,error}=await db.from('auditoria_logs').select('*').order('criado_em',{ascending:false}).limit(200);$('#auditBody').innerHTML=error?`<tr><td colspan="5">${esc(error.message)}</td></tr>`:(data||[]).map(x=>`<tr><td>${fmtDate(x.criado_em)}</td><td>${esc(x.acao)}</td><td>${esc(x.entidade)}</td><td>${esc(x.entidade_id)}</td><td>${esc(x.usuario_id)}</td></tr>`).join('')}
boot().catch(e=>{console.error(e);$('#accessDenied').classList.remove('hidden');$('#accessDenied').textContent=`Falha ao inicializar: ${e.message}`});
