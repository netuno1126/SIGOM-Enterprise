(() => {
const cfg=window.SIGOM_CONFIG||window.parent?.SIGOM_CONFIG;
const sb=window.supabase?.createClient&&cfg?window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey):null;
let session=null,profile=null,obj2=null,obj3=null,med2=[],med3=[],audit={},meta={},timers={};

const esc2=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const podeEditar=()=>['administrador','editor'].includes(String(profile?.perfil||'').toLowerCase());
function nBR(v){if(typeof v==='number')return Number.isFinite(v)?v:null;let s=String(v??'').replace(/R\$/gi,'').replace(/\s/g,'');if(!s)return null;if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:null}
const moeda=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—';
const pct=(a,b)=>Number(a)>0&&Number.isFinite(Number(b))?Number(b)/Number(a)*100:null;
const dataBR=v=>v?new Date(v+'T12:00:00').toLocaleDateString('pt-BR'):'—';
const dataHoraBR=v=>v?new Date(v).toLocaleString('pt-BR'):'—';
const pctTxt=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4})+'%':'—';

async function loadAudit(){const {data,error}=await sb.from('objetivos_auditoria').select('*');if(error)throw error;audit={};(data||[]).forEach(x=>audit[x.chave]={obs:x.observacao||'',auditado:!!x.auditado,situacaoManual:x.situacao||'',atualizadoEm:x.atualizado_em,atualizadoPor:x.atualizado_por})}
async function hist(k,campo,ant,novo){const m=meta[k]||{};await sb.from('objetivos_auditoria_historico').insert({chave:k,objetivo:m.objetivo||k.split('_')[0],opus:m.opus||null,contrato:m.contrato||null,acao:campo==='observacao'?'Observação registrada':campo==='auditado'?'Auditoria alterada':'Situação alterada',campo,valor_anterior:{valor:ant??null},valor_novo:{valor:novo??null},observacao:campo==='observacao'?String(novo||''):null,auditado:campo==='auditado'?!!novo:null,registrado_por:session.user.id,registrado_por_nome:profile?.nome||session.user.email})}
function persist(k,campo,ant,novo){const tk=k+'|'+campo;clearTimeout(timers[tk]);timers[tk]=setTimeout(async()=>{const it=audit[k]||{};const m=meta[k]||{};const {error}=await sb.from('objetivos_auditoria').upsert({chave:k,objetivo:m.objetivo||k.split('_')[0],opus:m.opus||null,contrato:m.contrato||null,situacao:it.situacaoManual||null,observacao:it.obs||'',auditado:!!it.auditado,atualizado_por:session.user.id,atualizado_em:new Date().toISOString()},{onConflict:'chave'});if(error)return alert('Erro ao salvar observação/auditoria: '+error.message);await hist(k,campo,ant,novo)},campo==='observacao'?500:50)}

function installAudit(){
window.getAuditItem=k=>audit[k]||(audit[k]={obs:'',auditado:false,situacaoManual:''});
window.getAuditObs=k=>window.getAuditItem(k).obs||'';
window.getAuditOk=k=>!!window.getAuditItem(k).auditado;
window.setAuditObs=(k,v)=>{if(!podeEditar())return;const it=window.getAuditItem(k),a=it.obs||'';it.obs=v||'';persist(k,'observacao',a,it.obs)};
window.setAuditOk=(k,v)=>{if(!podeEditar())return;const it=window.getAuditItem(k),a=!!it.auditado;it.auditado=!!v;persist(k,'auditado',a,it.auditado)};
window.setSituacaoManual=(k,v)=>{if(!podeEditar())return;const it=window.getAuditItem(k),a=it.situacaoManual||'';it.situacaoManual=v||'';persist(k,'situacao',a,it.situacaoManual)};
window.renderObsAudit=o=>{const k=window.chaveObraAudit(o);meta[k]={objetivo:o?.objetivoAudit||k.split('_')[0],opus:o?.opus||null,contrato:o?.contratoObj5||o?.contrato||null};const ok=window.getAuditOk(k),obs=esc2(window.getAuditObs(k)),has=String(o?.opus||'').replace(/\D/g,'')!=='';return '<div class="obsAuditWrap"><textarea placeholder="Escrever observação permanente..." '+(podeEditar()?'':'readonly ')+'oninput="setAuditObs(\''+esc2(k)+'\',this.value)">'+obs+'</textarea><button type="button" class="auditBox '+(ok?'ok':'')+'" '+(podeEditar()?'onclick="toggleAuditOk(\''+esc2(k)+'\',this)"':'disabled')+'>'+(ok?'OK':'Auditar')+'</button><button type="button" class="auditBox" onclick="abrirHistoricoObjetivo(\''+esc2(k)+'\')">🕘</button>'+(has?'<button type="button" class="auditBox" onclick="abrirFioObjetivo(\''+esc2(o.opus)+'\',\''+esc2(o.contrato||'')+'\')">FIO</button>':'')+'</div>'};
window.abrirFioObjetivo=(opus,contrato)=>{const q=new URLSearchParams();if(opus)q.set('opus',opus);if(contrato)q.set('contrato',contrato);window.open('/app/fio.html?'+q,'_blank','noopener')};
window.abrirHistoricoObjetivo=async k=>{const {data,error}=await sb.from('objetivos_auditoria_historico').select('*').eq('chave',k).order('registrado_em',{ascending:false}).limit(100);if(error)return alert(error.message);let ov=document.getElementById('objHist');if(!ov){ov=document.createElement('div');ov.id='objHist';ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:5000;display:flex;align-items:center;justify-content:center;padding:18px';document.body.appendChild(ov)}const rows=(data||[]).map(x=>'<tr><td>'+new Date(x.registrado_em).toLocaleString('pt-BR')+'</td><td>'+esc2(x.registrado_por_nome||'')+'</td><td>'+esc2(x.acao||'')+'</td><td>'+esc2(x.observacao||x.valor_novo?.valor||'')+'</td></tr>').join('');ov.innerHTML='<div style="background:#fff;border-radius:14px;width:min(900px,96vw);max-height:88vh;overflow:auto;padding:18px"><div style="display:flex;justify-content:space-between"><b>Histórico de observações e auditorias</b><button onclick="document.getElementById(\'objHist\').remove()">✕</button></div><table><thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Registro</th></tr></thead><tbody>'+(rows||'<tr><td colspan="4">Sem histórico.</td></tr>')+'</tbody></table></div>'};}

async function loadFinanceiro(){
 const [{data:o2},{data:o3},{data:m2,error:e2},{data:m3,error:e3}]=await Promise.all([
   sb.from('objetivos').select('*').eq('codigo','OBJ2').eq('exercicio',2026).maybeSingle(),
   sb.from('objetivos').select('*').eq('codigo','OBJ3').eq('exercicio',2026).maybeSingle(),
   sb.from('objetivos_indicadores_medicoes').select('*').eq('codigo_objetivo','OBJ2').order('data_referencia',{ascending:false}),
   sb.from('objetivos_indicadores_medicoes').select('*').eq('codigo_objetivo','OBJ3').order('data_referencia',{ascending:false})
 ]);
 if(e2)throw e2;if(e3)throw e3;obj2=o2;obj3=o3;med2=m2||[];med3=m3||[];
}

function renderObj2(){
 const el=document.getElementById('obj2');if(!el)return;
 const u=med2[0],p=u?.percentual_cancelados!=null?Number(u.percentual_cancelados):pct(u?.rpnp_inscritos,u?.rpnp_cancelados);
 const rows=med2.map(m=>'<tr><td>'+dataBR(m.data_referencia)+'</td><td>'+m.exercicio+'</td><td>'+moeda(m.rpnp_inscritos)+'</td><td>'+moeda(m.rpnp_cancelados)+'</td><td><b>'+pctTxt(m.percentual_cancelados)+'</b></td><td>'+esc2(m.observacao||'')+'</td><td>'+esc2(m.registrado_por_nome||'')+'</td></tr>').join('');
 el.innerHTML='<div class="card"><h2>Objetivo 02 — Reduzir a perda de Restos a Pagar Não Processados (RPNP)</h2><div class="note"><b>Indicador:</b> RPNP Cancelados ÷ RPNP Inscritos × 100.</div><div class="obj-financeiro-grid"><div class="obj-financeiro-card"><div class="lbl">RPNP Inscritos</div><div class="val">'+moeda(u?.rpnp_inscritos)+'</div></div><div class="obj-financeiro-card"><div class="lbl">RPNP Cancelados</div><div class="val">'+moeda(u?.rpnp_cancelados)+'</div></div><div class="obj-financeiro-card '+(p!=null&&p<=5?'meta':'')+'"><div class="lbl">% RPNP Cancelados</div><div class="val">'+pctTxt(p)+'</div></div><div class="obj-financeiro-card"><div class="lbl">Última medição</div><div class="val" style="font-size:16px">'+dataBR(u?.data_referencia)+'</div></div></div>'
 +(podeEditar()?'<div class="card" style="background:#f7fafc"><h3>Registrar/atualizar medição do Objetivo 2</h3><div class="filters"><label>Ano <input id="o2Ano" type="number" value="2026"></label><label>Data <input id="o2Data" type="date" value="'+new Date().toISOString().slice(0,10)+'"></label><label>RPNP Inscritos <input id="o2Inscritos" placeholder="226.830.970,87" oninput="calcObj2()"></label><label>RPNP Cancelados <input id="o2Cancelados" placeholder="1.290.032,08" oninput="calcObj2()"></label><label>% calculado <input id="o2Pct" readonly value="—"></label><label>Fonte/observação <input id="o2Obs" placeholder="S1/DOM"></label><button class="btn blue" onclick="salvarObj2()">💾 Salvar</button></div></div>':'')
 +window.renderStatusObjetivoGlobal('OBJ2','Objetivo 02')
 +'<div class="card"><h3>Histórico das medições</h3><div class="tblbox"><table><thead><tr><th>Data</th><th>Ano</th><th>RPNP Inscritos</th><th>RPNP Cancelados</th><th>%</th><th>Fonte</th><th>Responsável</th></tr></thead><tbody>'+(rows||'<tr><td colspan="7">Nenhuma medição.</td></tr>')+'</tbody></table></div></div></div>';
}

function renderObj3(){
 const el=document.getElementById('obj3');if(!el)return;
 const u=med3[0],p=u?.percentual_liquidado!=null?Number(u.percentual_liquidado):pct(u?.credito_recebido,u?.valor_liquidado);
 const rows=med3.map(m=>'<tr><td>'+dataBR(m.data_referencia)+'</td><td>'+m.exercicio+'</td><td>'+moeda(m.credito_recebido)+'</td><td>'+moeda(m.valor_liquidado)+'</td><td><b>'+pctTxt(m.percentual_liquidado)+'</b></td><td>'+esc2(m.observacao||'')+'</td><td>'+esc2(m.registrado_por_nome||'')+'</td></tr>').join('');
 el.innerHTML='<div class="card"><h2>Objetivo 03 — Aumentar as liquidações dos créditos recebidos</h2><div class="note"><b>Meta 2026:</b> liquidar, no mínimo, <b>75%</b> dos créditos recebidos no ano.</div><div class="obj-financeiro-grid"><div class="obj-financeiro-card"><div class="lbl">Crédito recebido</div><div class="val">'+moeda(u?.credito_recebido)+'</div></div><div class="obj-financeiro-card"><div class="lbl">Valor liquidado</div><div class="val">'+moeda(u?.valor_liquidado)+'</div></div><div class="obj-financeiro-card '+(p!=null&&p>=75?'meta':'')+'"><div class="lbl">% liquidado</div><div class="val">'+pctTxt(p)+'</div></div><div class="obj-financeiro-card meta"><div class="lbl">Meta anual</div><div class="val">≥ 75%</div></div></div><div class="obj-update-line">Dados atualizados em '+dataHoraBR(u?.atualizado_em||u?.registrado_em)+' · referência '+dataBR(u?.data_referencia)+'</div>'
 +(podeEditar()?'<div class="card" style="background:#f7fafc"><h3>Registrar/atualizar medição do Objetivo 3</h3><div class="filters"><label>Ano <input id="o3Ano" type="number" value="2026"></label><label>Data de referência <input id="o3Data" type="date" value="'+new Date().toISOString().slice(0,10)+'"></label><label>Crédito recebido <input id="o3Credito" placeholder="99.000.000,00" oninput="calcObj3()"></label><label>Valor liquidado <input id="o3Liquidado" placeholder="12.000.000,00" oninput="calcObj3()"></label><label>% calculado <input id="o3Pct" readonly value="—"></label><label>Fonte/observação <input id="o3Obs" placeholder="S1/DOM"></label><button class="btn blue" onclick="salvarObj3()">💾 Salvar medição</button><button class="btn" onclick="exportarPDFObjetivo3()">📄 Exportar PDF executivo</button></div></div>':'<button class="btn" onclick="exportarPDFObjetivo3()">📄 Exportar PDF executivo</button>')
 +window.renderStatusObjetivoGlobal('OBJ3','Objetivo 03')
 +'<div class="card"><h3>Histórico das medições</h3><div class="tblbox"><table><thead><tr><th>Data</th><th>Ano</th><th>Crédito recebido</th><th>Liquidado</th><th>% liquidado</th><th>Fonte</th><th>Responsável</th></tr></thead><tbody>'+(rows||'<tr><td colspan="7">Nenhuma medição registrada.</td></tr>')+'</tbody></table></div></div></div>';
}

window.calcObj2=()=>{const p=pct(nBR(document.getElementById('o2Inscritos')?.value),nBR(document.getElementById('o2Cancelados')?.value)),e=document.getElementById('o2Pct');if(e)e.value=pctTxt(p)};
window.calcObj3=()=>{const p=pct(nBR(document.getElementById('o3Credito')?.value),nBR(document.getElementById('o3Liquidado')?.value)),e=document.getElementById('o3Pct');if(e)e.value=pctTxt(p)};

window.salvarObj2=async()=>{if(!podeEditar())return alert('Apenas Administrador e Editor podem registrar medições.');const exercicio=Number(document.getElementById('o2Ano')?.value||2026),data_referencia=document.getElementById('o2Data')?.value,i=nBR(document.getElementById('o2Inscritos')?.value),c=nBR(document.getElementById('o2Cancelados')?.value),observacao=document.getElementById('o2Obs')?.value||'';if(!data_referencia||i==null||i<=0||c==null)return alert('Informe data, RPNP Inscritos e RPNP Cancelados.');const payload={objetivo_id:obj2?.id||null,codigo_objetivo:'OBJ2',exercicio,data_referencia,nome_indicador:'Percentual de RPNP cancelados',rpnp_inscritos:i,rpnp_cancelados:c,valor_realizado:pct(i,c),unidade:'%',observacao,registrado_por:session.user.id,registrado_por_nome:profile?.nome||session.user.email,atualizado_em:new Date().toISOString()};const {error}=await sb.from('objetivos_indicadores_medicoes').upsert(payload,{onConflict:'codigo_objetivo,exercicio,data_referencia,nome_indicador'});if(error)return alert('Erro ao salvar: '+error.message);await loadFinanceiro();renderObj2();alert('Medição do Objetivo 2 salva.')};

window.salvarObj3=async()=>{if(!podeEditar())return alert('Apenas Administrador e Editor podem registrar medições.');const exercicio=Number(document.getElementById('o3Ano')?.value||2026),data_referencia=document.getElementById('o3Data')?.value,c=nBR(document.getElementById('o3Credito')?.value),l=nBR(document.getElementById('o3Liquidado')?.value),observacao=document.getElementById('o3Obs')?.value||'';if(!data_referencia||c==null||c<=0||l==null)return alert('Informe data, crédito recebido e valor liquidado.');const payload={objetivo_id:obj3?.id||null,codigo_objetivo:'OBJ3',exercicio,data_referencia,nome_indicador:'Percentual de créditos liquidados',credito_recebido:c,valor_liquidado:l,valor_realizado:pct(c,l),unidade:'%',observacao,registrado_por:session.user.id,registrado_por_nome:profile?.nome||session.user.email,atualizado_em:new Date().toISOString()};const {error}=await sb.from('objetivos_indicadores_medicoes').upsert(payload,{onConflict:'codigo_objetivo,exercicio,data_referencia,nome_indicador'});if(error)return alert('Erro ao salvar: '+error.message);await loadFinanceiro();renderObj3();alert('Medição do Objetivo 3 salva: '+pctTxt(pct(c,l)))};

window.exportarPDFObjetivo3=()=>{
 const u=med3[0];if(!u)return alert('Registre ao menos uma medição do Objetivo 3.');
 let box=document.getElementById('obj3ExecPrint');if(!box){box=document.createElement('div');box.id='obj3ExecPrint';box.className='obj3-exec-print';document.body.appendChild(box)}
 const p=u.percentual_liquidado!=null?Number(u.percentual_liquidado):pct(u.credito_recebido,u.valor_liquidado);
 const historico=[
  {ano:2023,valor:'266 Mi',pct:'60% do crédito recebido no ano'},
  {ano:2024,valor:'256 Mi',pct:'68% do crédito recebido no ano'},
  {ano:2025,valor:'229 Mi',pct:'54% do crédito recebido no ano'}
 ];
 const anos=historico.map(h=>'<div class="year"><h3>Liquidações '+h.ano+' (R$)</h3><div class="body">'+h.valor+'<br><span style="font-size:14px">('+h.pct+')</span></div></div>').join('')
  +'<div class="year current"><h3>Liquidações 2026 (R$)</h3><div class="body">'+moeda(u.valor_liquidado)+'<br><span style="font-size:14px">('+pctTxt(p)+' do crédito recebido no ano)</span></div></div>';
 box.innerHTML='<div class="slide"><div class="top">OBJETIVOS E METAS DA DOM 2026</div><div class="title">Obj 3 - Aumentar as <b>Liquidações</b> para, no mínimo, <b>75%</b> em<br>relação ao <b>crédito recebido no ano.</b></div><div class="years">'+anos+'</div><div class="bottom"><div class="metric">Crédito até '+dataBR(u.data_referencia)+'<br>'+moeda(u.credito_recebido)+'</div><div class="metric">Liquidação até '+dataBR(u.data_referencia)+'<br>'+moeda(u.valor_liquidado)+' ('+pctTxt(p)+')</div></div><div class="foot">Atualizado em '+dataHoraBR(u.atualizado_em||u.registrado_em)+' · Fonte: '+esc2(u.observacao||'SIGOM/Supabase')+'</div></div>';
 document.body.classList.add('print-obj3-executivo');
 const fim=()=>{document.body.classList.remove('print-obj3-executivo');window.removeEventListener('afterprint',fim)};
 window.addEventListener('afterprint',fim);
 setTimeout(()=>window.print(),80);
};

async function init(){
 if(!sb)throw new Error('Supabase não configurado.');
 session=(await sb.auth.getSession()).data.session;if(!session)return window.parent.location.href='/';
 const {data:p,error}=await sb.from('profiles').select('nome,perfil,ativo').eq('id',session.user.id).maybeSingle();if(error)throw error;if(p?.ativo===false)throw new Error('Usuário inativo.');
 profile=p||{nome:session.user.email,perfil:'consulta'};
 await Promise.all([loadAudit(),loadFinanceiro()]);
 installAudit();
 const old=window.renderEstaticos;
 window.renderEstaticos=()=>{if(typeof old==='function')old();renderObj2();renderObj3()};
 window.renderAll();renderObj2();renderObj3();
 const f=document.getElementById('fonteInfo');if(f)f.textContent+=(f.textContent?' · ':'')+'objetivos financeiros, auditorias e indicadores no Supabase';
}
setTimeout(()=>init().catch(e=>{console.error(e);const f=document.getElementById('fonteInfo');if(f)f.textContent='Erro na integração de Objetivos: '+e.message}),900);
})();