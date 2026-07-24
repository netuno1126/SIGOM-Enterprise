let DATA=[], PORT=[], SALDOS=[], PORTKEYS=new Set(), charts={}, dataDate=null, curTab='visao';
let NOME_OBRA_MAP={};

const fmtBR=n=>isNum(n)?n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'-';
const fmtMi=n=>isNum(n)?'R$ '+n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'-';
const fmtR$=n=>isNum(n)?'R$ '+fmtBR(n):'-';
const pct=n=>isNum(n)?n.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%':'-';

const ALIASES={
  'Contrato':['Contrato','Nr Contrato','N° Contrato','Nº Contrato','Numero Contrato'],
  'Contratante':['Contratante','OM Contratante','Org Contratante','Órgão Contratante'],
  'Solicitação':['Solicitação','Nr Solicitação','N° Solicitação','Nº Solicitação','OPUS','Nr OPUS','Numero OPUS','Nº OPUS','Código da Obra','Codigo da Obra'],
  'Descrição':['Descrição','Descrição Solicitação','Descricao','Descricao Solicitacao','Descrição da Obra','Descricao da Obra'],
  'Empresa':['Empresa','Nome Fornecedor','Fornecedor','Construtora','Contratada'],
  'RM':['RM','Regiao Militar','Região Militar'],
  '% medido':['% medido','% Medido','percentual medido'],
  'Data Assinatura':['Data Assinatura','Assinatura de Contrato','Data Início'],
  'Início Obra':['Início (OS)','Inicio (OS)','Início OS','Inicio OS','Início da Obra','Inicio da Obra','Data da Ordem de Serviço','Data OS'],
  'Fim Prazo':['Fim Prazo','Término de Prazo','Termino de Prazo','Fim do Prazo'],
  'Fim Vigência':['Fim Vigência','Término de Vigência','Termino de Vigencia','Fim Vigencia'],
  'Data Última':['Data Última','Data da última medição','Data da ultima medição','Data da ultima medicao','Data Ultima'],
  'Ação Orçamentaria':['Ação Orçamentaria','Ação Orçamentária','Acao Orcamentaria'],
  'Falta Empenhar':['Falta Empenhar','Falta Descentralizar','Saldo a Descentralizar','saldo de empenho','Saldo de Empenho'],
  'Total Notas Fiscais':['Total Notas Fiscais','Total de Notas Fiscais','Total NF'],
  'Prazo Contratado':['Prazo Contratado','Prazo Total'],
  'obs':['obs','Observações','Observacoes','Observação'],
  'media medicao 3':['media medicao 3','media 90 dias','média 90 dias','media medição 3','média medição 3','media liq 3','média liq 3 últimas medições'],
  'media mensal global':['media mensal global','média mensal global','media mensal global (r$)','média mensal global (r$)','media mensal global liquidacao','média mensal global liquidação','media mensal de liquidacao global','média mensal de liquidação global','media mensal','média mensal','media global','média global','media mensal liquidacao','média mensal liquidação','media mensal de liquidacao','média mensal de liquidação','média mensal de liquidação global'],
};
const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
const NUMCOLS=['% estimado','% medido','Valor Solicitação','Valor Contratado','% Quarta','% Antepenúltima','% Penúltima','% Última','Valor Inicial','Valor Aditivado','Valor Apostilado','Valor Atual','Total NC','Total NE','% Empenhado','Falta Empenhar','Total Notas Fiscais','IDP','dias atrasados','% atraso','media medicao 3','media mensal global','RM'];

const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

let SEL=new Set(JSON.parse(store.get('go_sel')||'[]'));
let GRPSEL=new Set();

let sortK='Valor Atual',sortAsc=false;

const FIELD_DEFS=[
  // identificação
  ['obra','Obra'],['opus','Nº OPUS'],['om','OM Beneficiada'],['contrato','Contrato'],['empresa','Empresa'],['ao','Ação Orçamentária'],
  // FINANCEIRO
  ['vinicial','Valor Inicial'],['vatual','Valor Atual'],['empenhado','Empenhado (NE)'],['liquidado','Liquidado (NF)'],
  ['saldo','Saldo NE não liquidado'],['meses','Estimativa de Duração dos Recursos Atuais'],['falta','Falta Descentralizar'],
  ['media3','Média liq. 3 últimas medições'],['pcts','% Medido / Estimado'],['idp','IDP'],
  // PRAZOS
  ['osdata','Data da Ordem de Serviço'],['fimprazo','Fim do Prazo'],['fimvigencia','Término da Vigência'],
  ['termino','Término Projetado'],['projmed','Término pela Tendência das Medições'],
  ['noprazo','Obra no Prazo'],['semmedir','Dias sem medir'],['tend','Tendência'],
  // CARACTERÍSTICAS FIO (4ª linha)
  ['caracteristicas','Características Técnicas (FIO)'],['pa','PA'],['idpfio','IDP (FIO)'],['observacoes','Observações/Problemas Técnico-Orçamentários'],
];
// quais campos pertencem a cada fileira do detalhe
const SECTION_FIN=['vinicial','vatual','empenhado','liquidado','saldo','meses','falta','media3','pcts','idp'];
const SECTION_PZ=['osdata','fimprazo','fimvigencia','termino','projmed','noprazo','semmedir','tend'];
const SECTION_ID=['obra','opus','om','contrato','empresa','ao'];
const SECTION_FIO=['caracteristicas','pa','idpfio','observacoes'];
const DEFAULT_FIELDS=['opus','vatual','empenhado','liquidado','saldo','meses','falta','media3','pcts','idp','osdata','fimprazo','fimvigencia','termino','projmed','noprazo','semmedir','caracteristicas','pa','idpfio','observacoes'];
let FIELDS=new Set(JSON.parse(store.get('go_fields')||'null')||DEFAULT_FIELDS);
function fmtContrato(v){
  if(v==null||v==='')return '';
  // SheetJS pode interpretar "MM/AAAA" ou "NNN/AAAA" como data: reconverter para mm/aaaa
  if(v instanceof Date){
    const mm=String(v.getMonth()+1).padStart(2,'0');
    return mm+'/'+v.getFullYear();
  }
  if(typeof v==='number'){
    // serial de data do Excel
    try{const d=XLSX.SSF.parse_date_code(v); if(d)return String(d.m).padStart(2,'0')+'/'+d.y;}catch(e){}
    return String(v);
  }
  return String(v).trim();
}

function isNum(n){return typeof n==='number'&&isFinite(n)}

function dt(v){ if(v==null||v==='')return '-';
  if(typeof v==='number'){const d=XLSX.SSF.parse_date_code(v);return String(d.d).padStart(2,'0')+'/'+String(d.m).padStart(2,'0')+'/'+d.y}
  if(v instanceof Date)return v.toLocaleDateString('pt-BR');
  return String(v).split('T')[0].split('-').reverse().join('/')}

function asDate(v){ if(v==null)return null;
  if(v instanceof Date)return v;
  if(typeof v==='number'){const d=XLSX.SSF.parse_date_code(v);return new Date(d.y,d.m-1,d.d)}
  const s=String(v); let m=s.match(/(\d{4})-(\d{2})-(\d{2})/); if(m)return new Date(+m[1],+m[2]-1,+m[3]);
  m=s.match(/(\d{2})\/(\d{2})\/(\d{4})/); if(m)return new Date(+m[3],+m[2]-1,+m[1]); return null}

function noPrazo(r){const d=r['dias atrasados'];return (isNum(d)&&d>0)?'NÃO':'SIM'}

function diasDesdeAssinatura(r){
  const d=asDate(r['Data Assinatura']);
  if(!d)return null;
  const hoje=new Date();
  const hojeZero=new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate());
  const dataZero=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  const dias=Math.floor((hojeZero-dataZero)/864e5);
  return dias>0?dias:null;
}

function valorMediaMensalGlobal(r){
  // Cálculo oficial usado pelo dashboard:
  // média mensal global = Total Notas Fiscais / (HOJE() - Data Assinatura) * 30
  const nf=r['Total Notas Fiscais']||0;
  const dias=diasDesdeAssinatura(r);
  if(isNum(nf) && nf>0 && isNum(dias) && dias>0){
    return (nf/dias)*30;
  }

  // Fallback: se a planilha já trouxer a média mensal global pronta, usa a coluna.
  const direto=toNum(r['media mensal global']);
  if(isNum(direto) && direto>0) return direto;

  const candidatos=[
    'media mensal global','média mensal global','media mensal global (r$)','média mensal global (r$)',
    'media mensal global liquidacao','média mensal global liquidação',
    'media mensal de liquidacao global','média mensal de liquidação global',
    'media mensal liquidacao','média mensal liquidação',
    'media mensal de liquidacao','média mensal de liquidação',
    'media mensal','média mensal',
    'media global','média global'
  ].map(norm);

  for(const k of Object.keys(r)){
    const nk=norm(k);
    if(candidatos.some(c=>nk===c || nk.includes(c) || c.includes(nk))){
      const v=toNum(r[k]);
      if(isNum(v) && v>0) return v;
    }
  }
  return null;
}

function saldoNENaoLiquidado(r){
  return (r['Total NE']||0)-(r['Total Notas Fiscais']||0);
}

function mesesRecurso(r){
  // Estimativa = (Total NE - Total Notas Fiscais) / ((Total Notas Fiscais / (HOJE() - Data Assinatura)) * 30)
  const saldo=saldoNENaoLiquidado(r);
  const m=valorMediaMensalGlobal(r);
  if(!isNum(m)||m<=0)return null;
  return Math.floor(saldo/m);
}

function addMesesSIGOM(data, meses){
  const d=new Date(data.getFullYear(), data.getMonth(), data.getDate());
  d.setMonth(d.getMonth()+meses);
  return d;
}

function formatarEstimativaRecursosSIGOM(r){
  const meses=mesesRecurso(r);
  if(meses===null)return '-';
  if(meses>=12){
    const d=addMesesSIGOM(new Date(), meses);
    return d.toLocaleDateString('pt-BR');
  }
  return meses+(meses===1?' mês':' meses');
}

function detalheMesesRecurso(r){
  const saldo=saldoNENaoLiquidado(r);
  const m=valorMediaMensalGlobal(r);
  const dias=diasDesdeAssinatura(r);

  if(!isNum(m)||m<=0){
    if(!asDate(r['Data Assinatura'])) return {meses:null, texto:'Sem Data Assinatura', classe:'cwarn'};
    if(!isNum(r['Total Notas Fiscais']) || (r['Total Notas Fiscais']||0)<=0) return {meses:null, texto:'Sem Notas Fiscais', classe:'cwarn'};
    return {meses:null, texto:'Sem média mensal global', classe:'cwarn'};
  }

  const meses=Math.floor(saldo/m);
  const texto=meses>=12?addMesesSIGOM(new Date(),meses).toLocaleDateString('pt-BR'):(meses+(meses===1?' mês':' meses'));
  return {meses, texto, classe:meses<3?'cbad':'cok'};
}

function pctMedicaoValor(v){
  if(!isNum(v))return null;
  // Se a planilha trouxer percentual como 0,15, converte para 15.
  // Se trouxer como 15, mantém 15.
  return Math.abs(v)<=1 ? v*100 : v;
}

function valorMediaLiq3Ultimas(r){
  // Média liq. 3 últimas medições = média dos incrementos percentuais
  // convertidos em valor pelo Valor Inicial.
  // Fórmula aplicada: MÉDIA((Antepenúltima-Quarta);(Penúltima-Antepenúltima);(Última-Penúltima)) * Valor Inicial / 100
  const valorInicial = isNum(r['Valor Inicial']) ? r['Valor Inicial'] : null;
  if(!isNum(valorInicial) || valorInicial<=0){
    const pronto=toNum(r['media medicao 3']);
    return isNum(pronto)?pronto:null;
  }
  const q=pctMedicaoValor(r['% Quarta']);
  const a=pctMedicaoValor(r['% Antepenúltima']);
  const p=pctMedicaoValor(r['% Penúltima']);
  const u=pctMedicaoValor(r['% Última']);
  const deltas=[];
  if(isNum(a)&&isNum(q))deltas.push(a-q);
  if(isNum(p)&&isNum(a))deltas.push(p-a);
  if(isNum(u)&&isNum(p))deltas.push(u-p);
  if(!deltas.length){
    const pronto=toNum(r['media medicao 3']);
    return isNum(pronto)?pronto:null;
  }
  const mediaPct=deltas.reduce((x,y)=>x+y,0)/deltas.length;
  return (mediaPct*valorInicial)/100;
}

function projTermino(r){
  // tendência linear entre a primeira e a última medição disponíveis
  const pts=[['% Quarta','Data quarta'],['% Antepenúltima','Data Antepenúltima'],['% Penúltima','Data Penúltima'],['% Última','Data Última']]
    .map(([p,d])=>({v:r[p],d:asDate(r[d])})).filter(x=>isNum(x.v)&&x.d);
  if(pts.length<2)return null;
  const a=pts[0], b=pts[pts.length-1];
  if(b.v>=100)return {date:b.d, concluida:true};
  const dias=(b.d-a.d)/864e5;
  if(dias<=0)return null;
  const taxa=(b.v-a.v)/dias;
  if(taxa<=0)return null;
  const faltam=(100-b.v)/taxa;
  return {date:new Date(b.d.getTime()+faltam*864e5), taxa, ultimo:b};
}

function diasSemMedir(r){
  const d=asDate(r['Data Última']); if(!d)return null;
  return Math.floor((Date.now()-d.getTime())/864e5);
}

function obraKey(r){return String(r['Contrato']??'')+'|'+String(r['Solicitação']??'')}

function toNum(v){
  if(v==null||v==='')return null;
  if(typeof v==='number')return isFinite(v)?v:null;
  let s=String(v).replace(/R\$|\s|%/g,'');
  if(s===''||s==='-')return null;
  if(/,/.test(s)) s=s.replace(/\./g,'').replace(',','.');
  else if(/^\d{1,3}(\.\d{3})+$/.test(s)) s=s.replace(/\./g,'');
  const n=parseFloat(s); return isFinite(n)?n:null;
}

function normalizeRows(rows){
  if(!rows.length)return rows;
  const CANON=['RM','Contratante','OM Beneficiada','Contrato','Solicitação','Empresa','Descrição','% estimado','% medido','Valor Solicitação','Valor Contratado','Ações Financeiras','Data Assinatura','Início Obra','Fim Prazo','Fim Vigência','% Quarta','Data quarta','% Antepenúltima','Data Antepenúltima','% Penúltima','Data Penúltima','% Última','Data Última','Valor Inicial','Valor Aditivado','Valor Apostilado','Valor Atual','Total NC','Total NE','% Empenhado','Falta Empenhar','Total Notas Fiscais','Prazo Contratado','Ação Orçamentaria','IDP','data projetada','obs','dias atrasados','% atraso','media medicao 3','media mensal global','analise'];
  const canonByNorm={}; CANON.forEach(c=>canonByNorm[norm(c)]=c);
  // para cada coluna canônica, prioridade = posição na lista de aliases (menor = maior prioridade)
  const map={};       // chave original -> {canon, prio}
  Object.keys(rows[0]).forEach(k=>{
    const nk=norm(k); let canon=null, prio=99;
    for(const [c,alts] of Object.entries(ALIASES)){
      const idx=alts.findIndex(a=>norm(a)===nk);
      if(idx>=0){canon=c; prio=idx; break;}
    }
    if(!canon){canon=canonByNorm[nk]||String(k).trim(); prio=0;}
    map[k]={canon,prio};
  });
  const vazio=v=>v==null||v==='';
  return rows.map(r=>{
    const o={}, melhorPrio={};
    for(const [k,v] of Object.entries(r)){
      const {canon,prio}=map[k];
      // só sobrescreve se: campo ainda vazio, OU este alias tem prioridade melhor e traz valor
      if(!(canon in o) || (vazio(o[canon]) && !vazio(v)) || (prio < (melhorPrio[canon]??99) && !vazio(v))){
        if(!vazio(v) || !(canon in o)){ o[canon]=v; melhorPrio[canon]=prio; }
      }
    }
    NUMCOLS.forEach(c=>{ if(c in o) o[c]=toNum(o[c]); });
    return o;
  });
}

function consolidarObras(rows){
  const mapa=new Map();
  const vazios=[null,undefined,''];
  const firstValid=(a,b)=>vazios.includes(a)?b:a;
  const maiorNum=(a,b)=>isNum(b)?(isNum(a)?Math.max(a,b):b):a;
  const menorNum=(a,b)=>isNum(b)?(isNum(a)?Math.min(a,b):b):a;
  const dataMaisRecente=(a,b)=>{const da=asDate(a),db=asDate(b);return db&&(!da||db>da)?b:a};
  const dataMaisAntiga=(a,b)=>{const da=asDate(a),db=asDate(b);return db&&(!da||db<da)?b:a};

  function chaveConsolidacao(r){
    const contrato=String(r['Contrato']??'').trim();
    const opus=String(r['Solicitação']??'').trim();
    // CHAVE ÚNICA DA OBRA = OPUS + Contrato. Linhas com o mesmo OPUS+Contrato são a MESMA obra
    // (várias medições/NF/empenhos/aditivos) e devem ser consolidadas numa só.
    if(opus) return 'OP|'+opus+'|'+contrato;
    // sem OPUS: desambigua por descrição + OM (evita fundir obras diferentes do mesmo contrato)
    if(contrato) return 'CT|'+contrato+'|'+norm(r['Descrição'])+'|'+norm(r['OM Beneficiada']);
    return 'DS|'+[norm(r['Descrição']),norm(r['OM Beneficiada']),norm(r['Empresa'])].join('|');
  }

  rows.forEach((r,idx)=>{
    const key=chaveConsolidacao(r);
    if(!mapa.has(key)){
      mapa.set(key,{...r,__linhasConsolidadas:1,__primeiraLinha:idx+1});
      return;
    }
    const o=mapa.get(key);
    o.__linhasConsolidadas=(o.__linhasConsolidadas||1)+1;
    // a linha mais recente (por Data Última) define percentuais/IDP/datas "mais recentes"
    const rEhMaisRecente = (()=>{const da=asDate(o['Data Última']),db=asDate(r['Data Última']);return db&&(!da||db>=da)})();

    // Campos textuais: preserva a primeira informação preenchida e complementa vazios.
    ['RM','Contratante','OM Beneficiada','Contrato','Solicitação','Empresa','Descrição','Ações Financeiras','Prazo Contratado','Ação Orçamentaria','obs','analise'].forEach(c=>{
      o[c]=firstValid(o[c],r[c]);
    });

    // Valores financeiros/totais: normalmente já vêm acumulados na planilha; pega o maior valor
    // para não multiplicar o valor da obra quando a mesma aparece em várias linhas.
    ['Valor Solicitação','Valor Contratado','Valor Inicial','Valor Aditivado','Valor Apostilado','Valor Atual','Total NC','Total NE','Falta Empenhar','Total Notas Fiscais','media medicao 3','media mensal global'].forEach(c=>{
      o[c]=maiorNum(o[c],r[c]);
    });

    // Percentuais/indicadores: usa o valor da medição MAIS RECENTE (por Data Última).
    ['% estimado','% medido','% Empenhado','% Quarta','% Antepenúltima','% Penúltima','% Última','IDP'].forEach(c=>{
      o[c]= rEhMaisRecente ? firstValid(r[c],o[c]) : firstValid(o[c],r[c]);
    });

    // Atraso: mantém a pior situação. Para % atraso, mantém o maior percentual.
    o['dias atrasados']=maiorNum(o['dias atrasados'],r['dias atrasados']);
    o['% atraso']=maiorNum(o['% atraso'],r['% atraso']);

    // Datas de início ficam com a mais antiga; datas de medição/projeção/vigência ficam com a mais recente.
    ['Data Assinatura'].forEach(c=>{o[c]=dataMaisAntiga(o[c],r[c]);});
    ['Início Obra','Fim Prazo','Fim Vigência','Data quarta','Data Antepenúltima','Data Penúltima','Data Última','data projetada'].forEach(c=>{
      o[c]=dataMaisRecente(o[c],r[c]);
    });

    mapa.set(key,o);
  });

  return [...mapa.values()];
}

function pickSheet(wb){
  for(const name of wb.SheetNames){
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:null});
    if(!rows.length)continue;
    const keys=Object.keys(rows[0]).map(norm);
    if((keys.some(k=>k.includes('contrato'))||keys.some(k=>k.includes('codigo da obra')))&&keys.some(k=>k.includes('valor atual')))return rows;
  }
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:null});
}

function toggleCardCollapse(id, force){
  const card=document.getElementById(id); if(!card)return;
  const key='go_card_'+id+'_collapsed';
  const collapsed=(typeof force==='boolean')?force:!card.classList.contains('collapsed');
  card.classList.toggle('collapsed',collapsed);
  const btn=card.querySelector('.winToggle');
  if(btn){
    btn.textContent=collapsed?'□':'—';
    const isCampos=(id==='cardCamposDetalhe');
    btn.title=collapsed?(isCampos?'Expandir informações exibidas':'Expandir esta seção'):(isCampos?'Ocultar informações exibidas':'Ocultar esta seção');
    btn.setAttribute('aria-label',btn.title);
  }
  store.set(key,collapsed?'1':'0');
  if(!collapsed){
    setTimeout(()=>{try{Object.values(charts||{}).forEach(ch=>ch&&ch.resize&&ch.resize())}catch(e){}},80);
  }
}

function initCollapsibleCards(){
  ['cardResumoContratos','cardValorContratante','cardExecucaoMedEmp','cardCamposDetalhe'].forEach(id=>{
    toggleCardCollapse(id, store.get('go_card_'+id+'_collapsed')==='1');
  });
}

function pick(id){document.getElementById(id).click()}

function loadPort(buf,src){
  const wb=XLSX.read(buf,{type:'array',cellDates:true});
  PORT=consolidarObras(normalizeRows(pickSheet(wb)));
  aplicarNomesObras(PORT);
  renderGeneric('tblPort',PORT);
  applyPort();
}

function loadSaldos(buf,src){
  const wb=XLSX.read(buf,{type:'array',cellDates:true});
  // procura uma aba com coluna OM + colunas de anos; senão usa a primeira
  let rows=null;
  for(const name of wb.SheetNames){
    const rr=XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:null});
    if(rr.length&&Object.keys(rr[0]).some(k=>norm(k)==='om')&&Object.keys(rr[0]).some(k=>/^(19|20)\d{2}$/.test(String(k).trim()))){rows=rr;break}
  }
  if(!rows)rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:null});
  SALDOS=rows.map(r=>{const o={};for(const[k,v]of Object.entries(r))o[String(k).trim()]=v;return o});
  document.getElementById('saldoInfo').textContent='— '+SALDOS.length+' OM(s)/registro(s) · fonte: '+src;
  renderSaldos();
}

function saldoYears(){
  if(!SALDOS.length)return[];
  return Object.keys(SALDOS[0]).filter(k=>/^(19|20)\d{2}$/.test(k)).sort();
}

function isAggOM(om){const n=norm(om);return n==='total'||n==='eb'}

function renderSaldos(){
  if(!SALDOS.length)return;
  const years=saldoYears();
  const omCol=Object.keys(SALDOS[0]).find(k=>norm(k)==='om');
  if(!years.length||!omCol){ // formato desconhecido: tabela genérica
    renderGeneric('tblSaldos',SALDOS);
    document.getElementById('saldoFilters').style.display='none';
    document.getElementById('kpisSaldo').innerHTML='';
    return;
  }
  // filtros
  const fa=document.getElementById('fAnoSaldo'), fo=document.getElementById('fOMSaldo');
  document.getElementById('saldoFilters').style.display='flex';
  if(!fa.options.length){
    years.forEach(y=>{const o=document.createElement('option');o.value=y;o.textContent='Ano: '+y;fa.appendChild(o)});
    fa.value=years.includes(String(new Date().getFullYear()))?String(new Date().getFullYear()):years[years.length-1];
    SALDOS.filter(r=>!isAggOM(r[omCol])).forEach(r=>{const o=document.createElement('option');o.value=r[omCol];o.textContent=r[omCol];fo.appendChild(o)});
    fa.onchange=renderSaldos; fo.onchange=renderSaldos;
  }
  const ano=fa.value, omSel=fo.value;
  const oms=SALDOS.filter(r=>!isAggOM(r[omCol])&&(!omSel||r[omCol]===omSel));
  const tot=SALDOS.find(r=>norm(r[omCol])==='eb')||SALDOS.find(r=>norm(r[omCol])==='total');
  const anoAtual=String(new Date().getFullYear());
  const sumAno=y=>oms.reduce((a,r)=>a+(toNum(r[y])||0),0);
  const totAno=tot&&!omSel?(toNum(tot[ano])||0):sumAno(ano);
  const totGeral=years.reduce((a,y)=>a+(tot&&!omSel?(toNum(tot[y])||0):sumAno(y)),0);
  const maior=oms.slice().sort((a,b)=>(toNum(b[ano])||0)-(toNum(a[ano])||0))[0];
  document.getElementById('kpisSaldo').innerHTML=[
    ['Saldo Alongado Total ('+years[0]+'–'+years[years.length-1]+')','R$ '+(totGeral/1e9).toLocaleString('pt-BR',{maximumFractionDigits:1})+' Bi',''],
    ['Saldo em '+ano,'R$ '+(totAno/1e6).toLocaleString('pt-BR',{maximumFractionDigits:0})+' Mi',''],
    ['Maior saldo em '+ano,maior?maior[omCol]+' — '+fmtMi(toNum(maior[ano])):'-','alert'],
    ['OMs consideradas',oms.length,''],
  ].map(([l,v,c])=>`<div class="kpi ${c}"><div class="lbl">${l}</div><div class="val" style="font-size:18px">${v}</div></div>`).join('');
  // evolução por ano
  const evol=years.map(y=>+( (tot&&!omSel?(toNum(tot[y])||0):sumAno(y)) /1e9).toFixed(2));
  mkChart('chSaldoEvol','bar',{labels:years,datasets:[
    {type:'line',label:'TEREO',data:evol,borderColor:'#c00000',backgroundColor:'#c00000',tension:.3,pointRadius:4,order:0},
    {type:'bar',label:(omSel||'EB')+' (R$ Bi)',data:evol,backgroundColor:'#2e75b6',order:1}]},{});
  // comparação Total SOM x EB por ano
  const allOmsSom=SALDOS.filter(r=>!isAggOM(r[omCol]));
  const somEvol=years.map(y=>+((allOmsSom.reduce((a,r)=>a+(toNum(r[y])||0),0))/1e9).toFixed(2));
  const ebEvol=years.map(y=>+( (tot?(toNum(tot[y])||0):0) /1e9).toFixed(2));
  mkChart('chSaldoSomEb','line',{labels:years,datasets:[
    {label:'TOTAL SOM',data:somEvol,borderColor:'#2e75b6',backgroundColor:'#2e75b6',tension:.25,pointRadius:4},
    {label:'EB',data:ebEvol,borderColor:'#c00000',backgroundColor:'#c00000',tension:.25,pointRadius:4}
  ]},{});
  // barra por OM no ano escolhido
  document.getElementById('hSaldoOM').textContent='Saldo por OM em '+ano+' (R$ Mi)';
  const ord=SALDOS.filter(r=>!isAggOM(r[omCol])).slice().sort((a,b)=>(toNum(b[ano])||0)-(toNum(a[ano])||0));
  mkChart('chSaldoOM','bar',{labels:ord.map(r=>r[omCol]),datasets:[{label:'R$ Mi',
    data:ord.map(r=>+((toNum(r[ano])||0)/1e6).toFixed(1)),
    backgroundColor:ord.map(r=>omSel&&r[omCol]===omSel?'#e67e22':'#2e75b6')}]},
    {indexAxis:'y',plugins:{legend:{display:false}}});
  // tabela formatada em R$ Mi
  const cols=[omCol,...years,'total'].filter(c=>c in SALDOS[0]);
  document.querySelector('#tblSaldos thead').innerHTML='<tr>'+cols.map(c=>`<th>${c===omCol?'OM':c}</th>`).join('')+'</tr>';
  document.querySelector('#tblSaldos tbody').innerHTML=SALDOS.map(r=>{
    const agg=isAggOM(r[omCol]);
    return '<tr style="'+(agg?'font-weight:700;background:#eef5fc':'')+'">'+cols.map(c=>{
      if(c===omCol)return `<td>${r[c]??''}</td>`;
      const v=toNum(r[c]);
      return `<td>${v!=null?(v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1}):''}</td>`}).join('')+'</tr>'}).join('');
  document.querySelector('#tblSaldos').insertAdjacentHTML('afterend','');
}

function renderGeneric(tblId,rows){
  if(!rows.length)return;
  const cols=Object.keys(rows[0]);
  document.querySelector('#'+tblId+' thead').innerHTML='<tr>'+cols.map(c=>`<th>${c}</th>`).join('')+'</tr>';
  document.querySelector('#'+tblId+' tbody').innerHTML=rows.map(r=>'<tr>'+cols.map(c=>{
    let v=r[c];
    if(typeof v==='number')v=v.toLocaleString('pt-BR',{maximumFractionDigits:2});
    else if(v instanceof Date||/^data|Fim |Data /i.test(c))v=dt(v);
    return `<td>${v??''}</td>`}).join('')+'</tr>').join('');
}

function applyPort(){
  if(!PORT.length)return;
  const temValor=PORT.some(r=>isNum(r['Valor Atual']));
  document.getElementById('portInfo').textContent='— '+PORT.length+' obra(s) na planilha do Portfólio'+
    (temValor?' (com valores)':' ⚠ sem coluna "Valor Atual" — KPIs podem não somar');
  const fs=document.getElementById('fSel');
  if(fs)fs.checked=true; // abrir o dashboard com as obras do portfólio selecionado visíveis
  const fg=document.getElementById('fGrupo');
  if(fg && !fg.value)fg.value='__PORT__';
  preencherSelectAnalise();
  render();
  if(curTab==='analise')renderAnalise();
}

function saveSel(){store.set('go_sel',JSON.stringify([...SEL]));
  const el=document.getElementById('selCount'); if(el)el.textContent=SEL.size+' obra(s) selecionada(s) para o PowerPoint';
  saveGrpSel();}

function saveGrpSel(){const el=document.getElementById('grpSelCount'); if(el)el.textContent=GRPSEL.size+' obra(s) marcada(s) para Grupo';}

function toggleSel(key,on){on?SEL.add(key):SEL.delete(key);saveSel();if(document.getElementById('fSel').checked)render();}

function toggleGrpSel(key,on){on?GRPSEL.add(key):GRPSEL.delete(key);saveGrpSel();}

function selTodos(on){
  if(on){filtered().forEach(r=>SEL.add(obraKey(r)))}
  else{SEL=new Set()}  // limpa tudo, removendo qualquer resíduo antigo
  saveSel();render();
}

function groupKey(r){return String(r['Solicitação']??'').trim()+'|'+fmtContrato(r['Contrato']??'').trim()}

function legacyOpusKey(r){return String(r['Solicitação']??'').trim()}

function atualizarFiltrosAtivos(){
  const ids=['fGrupo','fRM','fCt','fEmp','fContrato','fPrazo','fBusca'];
  ids.forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    const ativo = String(el.value||'').trim()!=='';
    el.classList.toggle('sigom-filtro-ativo',ativo);
    if(ativo){
      const rotulo = el.tagName==='SELECT' ? (el.options[el.selectedIndex]?.textContent||el.value) : el.value;
      el.title='Filtro ativo: '+rotulo+' · apague ou selecione "todos" para limpar';
    }else{
      el.title=el.getAttribute('data-title-original')||el.title||'';
    }
  });
  const chk=document.getElementById('fSel');
  if(chk){
    const lab=chk.closest('label');
    if(lab){
      lab.classList.toggle('sigom-filtro-ativo',!!chk.checked);
      lab.title=chk.checked?'Filtro ativo: somente portfólio selecionado · desmarque para limpar':'Somente portfólio selecionado';
    }
  }
  document.querySelectorAll('#tbl thead .tblFilterRow input').forEach(inp=>{
    const ativo=String(inp.value||'').trim()!=='';
    inp.classList.toggle('sigom-filtro-ativo',ativo);
    inp.title=ativo?'Filtro ativo nesta coluna: '+inp.value+' · apague para limpar':(inp.placeholder||'Filtro da coluna');
  });
}

function realcarTermoTexto(v, termos){
  let html=escHtml(v);
  const lista=[...new Set((termos||[]).map(t=>String(t||'').trim()).filter(t=>t.length>=2))]
    .sort((a,b)=>b.length-a.length);
  lista.forEach(t=>{
    const safe=t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    try{html=html.replace(new RegExp('('+safe+')','gi'),'<span class="sigom-match">$1</span>');}catch(e){}
  });
  return html;
}

function termosAtivosBusca(){
  const termos=[];
  const q=document.getElementById('fBusca')?.value||'';
  q.split(/\s+/).forEach(t=>{if(t.trim().length>=2)termos.push(t.trim());});
  document.querySelectorAll('#tbl thead .tblFilterRow input').forEach(inp=>{
    const v=String(inp.value||'').trim(); if(v.length>=2)termos.push(v);
  });
  return termos;
}

function initFilters(){
  ['fGrupo','fRM','fCt','fEmp','fContrato','fPrazo','fBusca'].forEach(id=>{const el=document.getElementById(id); if(el&&!el.getAttribute('data-title-original'))el.setAttribute('data-title-original',el.title||'');});
  fill('fRM',[...new Set(DATA.map(r=>r.RM))].filter(v=>v!=null).sort((a,b)=>a-b));
  fill('fCt',[...new Set(DATA.map(r=>r.Contratante))].filter(Boolean).sort());
  fill('fEmp',[...new Set(DATA.map(r=>r.Empresa))].filter(Boolean).sort());
  preencherFiltroContratos();
  ['fRM','fCt','fEmp','fContrato','fPrazo','fSel'].forEach(id=>document.getElementById(id).onchange=render);
  document.getElementById('fBusca').oninput=render;
  document.querySelectorAll('#tbl thead .tblFilterRow input').forEach(inp=>inp.oninput=render);
  saveSel();
}

function fill(id,vals){const s=document.getElementById(id);
  [...s.querySelectorAll('option:not(:first-child)')].forEach(o=>o.remove());
  vals.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=(id==='fRM'?'RM ':'')+v;s.appendChild(o)})}

function agruparPorContrato(rows){
  const mapa={};
  rows.forEach(r=>{
    const contrato=fmtContrato(r.Contrato)||'(sem contrato)';
    if(!mapa[contrato])mapa[contrato]={contrato,opus:new Set(),valor:0,ne:0,nf:0,obras:0};
    const g=mapa[contrato];
    const opus=String(r['Solicitação']??'').trim();
    if(opus)g.opus.add(opus);
    g.valor+=(isNum(r['Valor Atual'])?r['Valor Atual']:0);
    g.ne+=(isNum(r['Total NE'])?r['Total NE']:0);
    g.nf+=(isNum(r['Total Notas Fiscais'])?r['Total Notas Fiscais']:0);
    g.obras++;
  });
  return Object.values(mapa).sort((a,b)=>String(a.contrato).localeCompare(String(b.contrato),'pt-BR',{numeric:true}));
}

function preencherFiltroContratos(){
  const s=document.getElementById('fContrato'); if(!s)return;
  const atual=s.value;
  s.innerHTML='<option value="">Contrato — todos</option>';
  agruparPorContrato(DATA).forEach(g=>{
    const o=document.createElement('option');
    o.value=g.contrato;
    o.textContent=`${g.contrato} — ${g.opus.size} OPUS — ${fmtMi(g.valor)}`;
    s.appendChild(o);
  });
  if([...s.options].some(o=>o.value===atual))s.value=atual;
}

function renderResumoContratos(rows){
  const tb=document.querySelector('#tblResumoContratos tbody'); if(!tb)return;
  const grupos=agruparPorContrato(rows);
  tb.innerHTML=grupos.map(g=>{
    const opus=[...g.opus].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR',{numeric:true}));
    const contratoEsc=esc(g.contrato);
    return `<tr class="clickable" title="Clique para filtrar este contrato" onclick="document.getElementById('fContrato').value='${contratoEsc}';render();window.scrollTo({top:0,behavior:'smooth'});">
      <td><b>${contratoEsc}</b></td>
      <td style="text-align:center"><b>${g.opus.size}</b></td>
      <td>${opus.map(esc).join(', ')||'—'}</td>
      <td><b>${fmtMi(g.valor)}</b></td>
      <td>${fmtMi(g.ne)}</td>
      <td>${fmtMi(g.nf)}</td>
      <td>${fmtMi(g.ne-g.nf)}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" class="note" style="text-align:center;padding:12px">Nenhum contrato encontrado nos filtros atuais.</td></tr>';
}

function colFilterPass(r){
  const inputs=document.querySelectorAll('#tbl thead .tblFilterRow input');
  for(const inp of inputs){
    const q=String(inp.value||'').toLowerCase().trim(); if(!q)continue;
    const c=inp.dataset.col;
    let v='';
    if(c==='_prazo')v=noPrazo(r);
    else if(c==='Contrato')v=fmtContrato(r[c]);
    else if(c==='data projetada')v=dt(r[c]);
    else if(c==='Valor Atual')v=fmtMi(r[c]);
    else if(c==='% medido'||c==='% Empenhado')v=pct(r[c]);
    else v=String(r[c]??'');
    if(!String(v).toLowerCase().includes(q))return false;
  }
  return true;
}

function filtered(){
  const rm=document.getElementById('fRM').value, ct=document.getElementById('fCt').value,
        em=document.getElementById('fEmp').value, contratoFiltro=(document.getElementById('fContrato')||{}).value||'', pz=document.getElementById('fPrazo').value,
        so=document.getElementById('fSel').checked, q=document.getElementById('fBusca').value.toLowerCase();
  const grp=(document.getElementById('fGrupo')||{}).value||'';
  // Abertura padrão: quando houver portfólio carregado, a visão inicial prioriza Portfólio Selecionado.
  let base = (so && PORT.length) ? PORT : DATA;
  if(grp==='__PORT__') base = PORT.length?PORT:DATA;
  else if(grp){ const ops=SG_GROUP_MAP.get(grp)||new Set();
    base = base.filter(r=>ops.has(r._uuid)); }
  return base.filter(r=>(!rm||String(r.RM)===rm)&&(!ct||r.Contratante===ct)&&(!em||r.Empresa===em)
    &&(!contratoFiltro||fmtContrato(r.Contrato)===contratoFiltro)
    &&(!pz||noPrazo(r)===pz)&& colFilterPass(r) &&
    (!q||[r['Descrição'],r['Nome da Obra'],r.Contrato,r['Solicitação'],r.Empresa,r['OM Beneficiada'],r.RM].join(' ').toLowerCase().includes(q)));
}

function render(){
  atualizarFiltrosAtivos();
  const termosBusca=termosAtivosBusca();
  const rows=filtered();
  // alerta: busca por OPUS/contrato sem resultado → planilha-fonte pode estar desatualizada
  const qBusca=(document.getElementById('fBusca').value||'').trim();
  let alerta=document.getElementById('avisoFonte');
  if(!alerta){alerta=document.createElement('div');alerta.id='avisoFonte';
    alerta.style.cssText='display:none;margin:0 0 12px;padding:10px 14px;border-radius:10px;background:#fff3f0;border:1px solid #c00000;color:#7a1a14;font-size:13px;font-weight:600';
    const k=document.getElementById('kpis'); k.parentNode.insertBefore(alerta,k);}
  if(qBusca.length>=4 && rows.length===0){
    alerta.style.display='block';
    alerta.innerHTML='⚠ Nenhuma obra encontrada para "<b>'+qBusca.replace(/[<>]/g,'')+'</b>". Verifique o Nº OPUS/contrato ou <b>atualize a planilha-fonte de dados</b> (pasta 1-Planilha de Obras_Dash, 2-Planilha portfólio_Dash ou Objetivos e Metas/Relatorio_Gerencial.xlsx).';
  }else{alerta.style.display='none';}
  const sum=k=>rows.reduce((a,r)=>a+(isNum(r[k])?r[k]:0),0);
  const contratosResumo=agruparPorContrato(rows);
  const opusUnicos=new Set(rows.map(r=>String(r['Solicitação']??'').trim()).filter(Boolean));
  const contratoSelecionado=(document.getElementById('fContrato')||{}).value||'';
  document.getElementById('kpis').innerHTML=[
    ['Obras',rows.length,''],
    [contratoSelecionado?'Nº OPUS neste contrato':'Nº OPUS únicos',opusUnicos.size,''],
    ['Contratos filtrados',contratosResumo.length,''],
    [contratoSelecionado?'Valor total do contrato':'Valor Atual Total',fmtMi(sum('Valor Atual')),''],
    ['Empenhado (NE)',fmtMi(sum('Total NE')),''],
    ['Liquidado (NF)',fmtMi(sum('Total Notas Fiscais')),''],
    ['Saldo NE não liquidado',fmtMi(sum('Total NE')-sum('Total Notas Fiscais')),''],
  ].map(([l,v,c])=>`<div class="kpi ${c}"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join('');
  renderResumoContratos(rows);

  rows.sort((a,b)=>{const x=a[sortK],y=b[sortK];
    if(sortK==='data projetada'){const dx=asDate(x),dy=asDate(y);return ((dx?dx:0)-(dy?dy:0))*(sortAsc?1:-1)}
    return (isNum(x)&&isNum(y)?x-y:String(x??'').localeCompare(String(y??'')))*(sortAsc?1:-1)});
  document.getElementById('nObras').textContent=rows.length;
  document.querySelector('#tbl tbody').innerHTML=rows.map(r=>{
    const np=noPrazo(r), key=obraKey(r);
    return `<tr class="clickable ${np==='NÃO'?'atrasada':''}" onclick="openObra('${esc(key)}')" oncontextmenu="menuObra(event,'${esc(groupKey(r))}')">
      <td class="no-print" onclick="event.stopPropagation()"><input type="checkbox" title="Marque esta obra para PowerPoint" ${SEL.has(key)?'checked':''} onchange="toggleSel('${esc(key)}',this.checked)"></td>
      <td class="no-print" onclick="event.stopPropagation()"><input type="checkbox" title="Marque esta obra para adicionar a um grupo" ${GRPSEL.has(groupKey(r))?'checked':''} onchange="toggleGrpSel('${esc(groupKey(r))}',this.checked)"></td>
      <td>${realcarTermoTexto(r.RM??'',termosBusca)}</td><td>${realcarTermoTexto(r.Contratante??'',termosBusca)}</td>
      <td>${realcarTermoTexto(r['Solicitação']??'',termosBusca)}</td><td>${realcarTermoTexto(r['Descrição']??'',termosBusca)}</td><td>${realcarTermoTexto(r['Nome da Obra']||'',termosBusca)}</td>
      <td>${realcarTermoTexto(fmtContrato(r.Contrato),termosBusca)}</td><td>${realcarTermoTexto(r.Empresa??'',termosBusca)}</td>
      <td>${fmtMi(r['Valor Atual'])}</td><td>${pct(r['% medido'])}</td><td>${pct(r['% Empenhado'])}</td>
      <td>${dt(r['data projetada'])}</td>
      <td>${isNum(r['dias atrasados'])?Math.max(0,Math.round(r['dias atrasados'])):'-'}</td>
      <td><span class="tag ${np==='SIM'?'sim':'nao'}">${np}</span></td></tr>`}).join('');
  document.querySelectorAll('#tbl th[data-k]').forEach(th=>th.onclick=()=>{const kk=th.dataset.k;sortAsc=(sortK===kk)?!sortAsc:false;sortK=kk;render()});

  const byCt={}; rows.forEach(r=>{byCt[r.Contratante]=(byCt[r.Contratante]||0)+(r['Valor Atual']||0)});
  const ents=Object.entries(byCt).sort((a,b)=>b[1]-a[1]).slice(0,15);
  mkChart('chCt','bar',{labels:ents.map(e=>e[0]),datasets:[{label:'Valor Atual (R$ Mi)',data:ents.map(e=>+(e[1]/1e6).toFixed(1)),backgroundColor:'#2e75b6'}]},{indexAxis:'y'});
  const top=rows.slice().sort((a,b)=>(b['Valor Atual']||0)-(a['Valor Atual']||0)).slice(0,15);
  mkChart('chExec','bar',{labels:top.map(r=>r.Contrato),datasets:[
    {label:'% Empenhado',data:top.map(r=>r['% Empenhado']),backgroundColor:'#1e4e79'},
    {label:'% Medido',data:top.map(r=>r['% medido']),backgroundColor:'#70ad47'}]},{});
}

function toggleFields(){
  const box=document.getElementById('cardCamposDetalhe');
  if(!box)return;
  box.classList.toggle('hidden');
  if(!box.classList.contains('hidden')){
    // Ao abrir o painel, mantém a preferência do usuário: expandido ou oculto.
    toggleCardCollapse('cardCamposDetalhe', store.get('go_card_cardCamposDetalhe_collapsed')==='1');
  }
}

function initFieldPanel(){
  document.getElementById('fieldPanel').innerHTML=FIELD_DEFS.map(([k,l])=>
    `<label><input type="checkbox" ${FIELDS.has(k)?'checked':''} onchange="toggleField('${k}',this.checked)"> ${l}</label>`).join('');
}

function toggleField(k,on){on?FIELDS.add(k):FIELDS.delete(k);
  store.set('go_fields',JSON.stringify([...FIELDS]));
  renderObra(+document.getElementById('selObra').value||0);}

function initObraSelect(){
  const s=document.getElementById('selObra');
  function desenharSelect(q=''){
    const atual=s.value; s.innerHTML='';
    const qq=String(q||'').toLowerCase();
    DATA.forEach((r,i)=>{
      const texto=[r['Descrição'],r['Solicitação'],fmtContrato(r.Contrato),r.Empresa,r['OM Beneficiada'],r.RM].join(' ').toLowerCase();
      if(qq && !texto.includes(qq))return;
      const o=document.createElement('option');o.value=i;
      o.textContent=`${r['Descrição']} — OPUS ${r['Solicitação']??'-'} — Ctr ${fmtContrato(r.Contrato)}`;s.appendChild(o)
    });
    if([...s.options].some(o=>o.value===atual))s.value=atual;
    if(!s.options.length){const o=document.createElement('option');o.value='';o.textContent='Nenhuma obra encontrada';s.appendChild(o)}
  }
  desenharSelect('');
  const busca=document.getElementById('buscaObraDetalhe'); if(busca)busca.oninput=()=>desenharSelect(busca.value);
  s.onchange=()=>renderObra(+s.value);
  const sa=document.getElementById('selAtrasadas');
  [...sa.querySelectorAll('option:not(:first-child)')].forEach(o=>o.remove());
  DATA.forEach((r,i)=>{ if(noPrazo(r)==='NÃO'){
    const o=document.createElement('option');o.value=i;
    o.textContent=`🚨 ${r['Descrição']} — ${Math.round(r['dias atrasados'])} dias`;sa.appendChild(o)}});
  sa.onchange=()=>{if(sa.value!==''){document.getElementById('selObra').value=sa.value;renderObra(+sa.value);sa.selectedIndex=0}};
  initFieldPanel();
}

function openObra(key){
  const i=DATA.findIndex(r=>obraKey(r)===key);
  if(i<0){alert('Obra não encontrada após consolidação. Recarregue o dashboard.');return;}
  document.getElementById('selObra').value=i; show('obra'); renderObra(i);
}

function toggleDrop(id,ev){
  if(ev)ev.stopPropagation();
  const d=document.getElementById(id);
  document.querySelectorAll('.dropdown.open').forEach(x=>{if(x!==d)x.classList.remove('open')});
  d.classList.toggle('open');
}

function closeDrops(){document.querySelectorAll('.dropdown.open').forEach(x=>x.classList.remove('open'))}

function show(id){
  curTab=id;
  ['visao','obra','analise','mediaGlobal','planilha','saldos','portfolio'].forEach(t=>document.getElementById(t).classList.toggle('hidden',t!==id));
  [['tabV','visao'],['tabO','obra'],['tabA','analise'],['tabM','mediaGlobal'],['tabP','planilha'],['tabS','saldos'],['tabF','portfolio']]
    .forEach(([b,t])=>document.getElementById(b).classList.toggle('on',t===id));
  const ed=document.getElementById('tabExtraDrop'); if(ed)ed.classList.toggle('open',false);
  const eb=document.getElementById('tabExtraBtn'); if(eb)eb.style.cssText=(id==='planilha'||id==='portfolio')?'background:var(--azul);color:#fff':'';
  if(id==='obra'&&DATA.length)renderObra(+document.getElementById('selObra').value||0);
  if(id==='analise'&&DATA.length)renderAnalise();
  if(id==='mediaGlobal'&&DATA.length)renderMediaMensalGlobal();
  if(id==='planilha'&&DATA.length)renderPlanilha();
  if(id==='saldos')renderSaldos();
}

function renderObra(i){
  const r=DATA[i]; if(!r)return;
  const ne=r['Total NE']||0, nf=r['Total Notas Fiscais']||0, np=noPrazo(r);
  const infoMeses=detalheMesesRecurso(r);
  const meses=infoMeses.meses, dsm=diasSemMedir(r);
  const all={
    obra:['c1','Obra',r['Descrição']],
    opus:['c2','Nº OPUS',r['Solicitação']],
    om:['c1','OM Beneficiada',r['OM Beneficiada'],false,`Consolidado de ${r.__linhasConsolidadas||1} linha(s) da planilha (a partir da linha ${r.__primeiraLinha||'?'}). Se a OM não casar, verifique essa linha na planilha-fonte.`],
    contrato:['c2','Contrato',fmtContrato(r.Contrato)],
    empresa:['c2','Empresa',r.Empresa],
    vinicial:['c3','Valor Inicial',fmtMi(r['Valor Inicial'])],
    vatual:['c3','Valor Atual',fmtMi(r['Valor Atual'])],
    empenhado:['c1','Empenhado (NE)',fmtMi(ne)],
    liquidado:['c1','Liquidado (NF)',fmtMi(nf)],
    saldo:['c4','Saldo NE não liquidado',fmtMi(ne-nf)],
    meses:[infoMeses.classe,'Estimativa de Duração dos Recursos Atuais',infoMeses.texto],
    falta:['c4','Falta Descentralizar',fmtMi(r['Falta Empenhar'])],
    ao:['c2','Ação Orçamentária',r['Ação Orçamentaria']],
    pcts:['c3','% Medido / Estimado',pct(r['% medido'])+' / '+pct(r['% estimado'])],
    fimprazo:['c2','Fim do Prazo',dt(r['Fim Prazo'])],
    osdata:['c2','Data da Ordem de Serviço',dt(r['Início Obra'])],
    fimvigencia:['c2','Término da Vigência',dt(r['Fim Vigência'])],
    termino:['c2','Término Projetado',dt(r['data projetada'])],
    projmed:[(()=>{const p=projTermino(r);if(!p||p.concluida)return 'c4';const fp=asDate(r['Fim Prazo']);return fp&&p.date>fp?'cbad':'cok'})(),'Término pela Tendência das Medições',(()=>{const p=projTermino(r);return p?(p.concluida?'Concluída':p.date.toLocaleDateString('pt-BR')):'-'})()],
    noprazo:[np==='SIM'?'cok':'cbad','Obra no Prazo',np+(isNum(r['dias atrasados'])&&r['dias atrasados']>0?` (${Math.round(r['dias atrasados'])} dias)`:'')],
    semmedir:[dsm!==null&&dsm>90?'cwarn':'c4','Dias sem medir',dsm!==null?dsm+' dias':'-'],
    media3:['c4','Média liq. 3 últimas medições',fmtR$(valorMediaLiq3Ultimas(r))],
    idp:['c4','IDP',isNum(r.IDP)?r.IDP.toLocaleString('pt-BR',{maximumFractionDigits:2}):'-'],
    tend:['c4','Tendência',r.analise??'-'],
  };
  // 4ª linha — características técnicas (FIO), PA, IDP e observações
  const fio=fioCaracteristicas(r);
  const caracTxt=[
    ['Concepção do Objeto',fio.concepcao],['Fundações',fio.fundacoes],['Estrutura',fio.estrutura],
    ['Cobertura',fio.cobertura],['Paredes Internas',fio.paredes],['Terraplenagem e Pavimentação',fio.terra]
  ].map(([l,v])=>`<div><b>${l}:</b> ${v||'—'}</div>`).join('');
  all.caracteristicas=['fio-carac','Características Técnicas da Obra (FIO)',caracTxt,true];
  all.pa=[fio.pa==='Sim'?'cok':(fio.pa==='Não'?'cbad':'c4'),'PA',fio.pa||'—'];
  all.idpfio=['c4','IDP',isNum(r.IDP)?r.IDP.toLocaleString('pt-BR',{maximumFractionDigits:2}):'-'];
  all.observacoes=['fio-obs','Observações / Problemas Técnico-Orçamentários',(fio.obs||'—'),true];
  const STATUS=['cok','cbad','cwarn'];
  const cardHTML=k=>{const a=all[k];if(!a)return '';const[c,l,v,wide,tip]=a;
    const cls=STATUS.includes(c)?c:'';   // status (verde/vermelho/laranja) vence a cor da seção
    const t=tip?` title="${String(tip).replace(/"/g,'&quot;')}"`:'';
    if(wide)return `<div class="dcard wide ${cls}"${t}><span class="dcard-lbl">${l}</span><div class="dcard-text">${v??'—'}</div></div>`;
    return `<div class="dcard ${cls}"${t}>${l}<b>${v??'-'}</b></div>`;};
  const secHTML=(titulo,chaves,secClass,colapsavel,id)=>{
    const cards=chaves.filter(k=>FIELDS.has(k)).map(cardHTML).filter(Boolean).join('');
    if(!cards)return '';
    if(colapsavel){
      const aberto = store.get('go_sec_'+id)!=='0';   // lembra preferência por seção
      return `<div class="dsec-title clic" onclick="toggleSec('${id}')">`+
             `<span class="dsec-arrow" id="arr_${id}">${aberto?'▾':'▸'}</span> ${titulo}</div>`+
             `<div class="dsec-row ${secClass||''}" id="${id}" style="${aberto?'':'display:none'}">${cards}</div>`;
    }
    return `<div class="dsec-title">${titulo}</div><div class="dsec-row ${secClass||''}">${cards}</div>`;
  };
  document.getElementById('dCards').innerHTML=
    secHTML('Identificação',SECTION_ID,'sec-id')+
    secHTML('Financeiro da obra',SECTION_FIN,'sec-fin')+
    secHTML('Prazos',SECTION_PZ,'sec-pz')+
    secHTML('Características e Observações (FIO)',SECTION_FIO,'sec-fio',true,'secFIO');

  const pts=[['% Quarta','Data quarta'],['% Antepenúltima','Data Antepenúltima'],['% Penúltima','Data Penúltima'],['% Última','Data Última']]
    .filter(([p])=>isNum(r[p]));
  const pj=projTermino(r);
  const labels=pts.map(([,d])=>dt(r[d]));
  const medidos=pts.map(([p])=>r[p]);
  const dsets=[
    {label:'% Medido',data:medidos.slice(),borderColor:'#70ad47',backgroundColor:'#70ad47',tension:.3}
  ];
  if(pj&&!pj.concluida){
    // projeção MÊS A MÊS do último ponto medido até o término estimado (curva menos acentuada)
    const ultData=asDate(pts.length?r[pts[pts.length-1][1]]:null) || new Date();
    const ultPct=medidos.length?medidos[medidos.length-1]:0;
    const fim=pj.date;
    const proj=[]; // pares [labelData, pct]
    let cur=new Date(ultData.getFullYear(),ultData.getMonth(),1);
    cur.setMonth(cur.getMonth()+1);
    const totalDias=(fim-ultData)/864e5 || 1;
    let guard=0;
    while(cur<fim && guard<60){
      const dias=(cur-ultData)/864e5;
      const p=ultPct+(100-ultPct)*(dias/totalDias);
      proj.push([cur.toLocaleDateString('pt-BR',{month:'2-digit',year:'2-digit'}), Math.min(100,+p.toFixed(1))]);
      cur=new Date(cur.getFullYear(),cur.getMonth()+1,1); guard++;
    }
    proj.push(['Término '+fim.toLocaleDateString('pt-BR',{month:'2-digit',year:'numeric'}), 100]);
    // a série de projeção começa ancorada no último ponto medido
    const baseLen=labels.length;
    proj.forEach(([lb])=>labels.push(lb));
    dsets[0].data.push(...proj.map(()=>null)); // % medido não continua
    const projData=[...Array(baseLen-1).fill(null), ultPct, ...proj.map(p=>p[1])];
    dsets.push({label:'Projeção mensal (tendência das medições)',
      data:projData, borderColor:'#1e4e79', borderDash:[6,4],
      pointRadius:projData.map((v,i)=>i>=baseLen?3:0), pointBackgroundColor:'#1e4e79', tension:.35});
  }
  mkChart('chCurva','line',{labels,datasets:dsets},
    {scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%'}},x:{ticks:{maxRotation:60,minRotation:0,autoSkip:true}}}});
  mkChart('chFin','bar',{labels:['Valor Atual','Empenhado','Liquidado','Saldo NE','Falta Descentralizar'],datasets:[{label:'R$ Mi',
    data:[r['Valor Atual'],ne,nf,ne-nf,r['Falta Empenhar']].map(v=>+((v||0)/1e6).toFixed(2)),
    backgroundColor:['#1e4e79','#2e75b6','#70ad47','#8aa3bd','#c00000']}]},{plugins:{legend:{display:false}}});
}

function renderMediaMensalGlobal(){
  const rows=DATA.map(r=>{
    const media=valorMediaMensalGlobal(r);
    const saldo=saldoNENaoLiquidado(r);
    const meses=isNum(media)&&media>0?Math.floor(saldo/media):null;
    return {r, media, saldo, meses, dias:diasDesdeAssinatura(r)};
  });

  const valid=rows.filter(x=>isNum(x.media)&&x.media>0);
  const somaMedia=valid.reduce((a,x)=>a+x.media,0);
  const somaSaldo=rows.reduce((a,x)=>a+(isNum(x.saldo)?x.saldo:0),0);
  const mesesGlobal=somaMedia>0?Math.floor(somaSaldo/somaMedia):null;
  const criticas=rows.filter(x=>x.meses!==null&&x.meses<3).length;

  const k=document.getElementById('kpisMediaGlobal');
  if(k){
    k.innerHTML=[
      ['Obras analisadas',rows.length,''],
      ['Média mensal global somada',fmtMi(somaMedia)+'/mês',''],
      ['Saldo NE não liquidado',fmtMi(somaSaldo),''],
      ['Estimativa global',mesesGlobal!==null?mesesGlobal+(mesesGlobal===1?' mês':' meses'):'-',mesesGlobal!==null&&mesesGlobal<3?'alert':'ok'],
      ['Obras < 3 meses',criticas,criticas?'alert':'ok']
    ].map(([l,v,c])=>`<div class="kpi ${c}"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join('');
  }

  const tbody=document.querySelector('#tblMediaGlobal tbody');
  if(tbody){
    tbody.innerHTML=rows
      .sort((a,b)=>(a.meses===null?999999:a.meses)-(b.meses===null?999999:b.meses))
      .map(x=>{
        const r=x.r;
        const cls=x.meses!==null&&x.meses<3?' style="background:#fff3f0"':'';
        return `<tr${cls}>
          <td>${r['Descrição']??''}</td>
          <td>${r['Solicitação']??''}</td>
          <td>${r.Contrato??''}</td>
          <td>${r.Empresa??''}</td>
          <td>${fmtMi(r['Total NE'])}</td>
          <td>${fmtMi(r['Total Notas Fiscais'])}</td>
          <td>${fmtMi(x.saldo)}</td>
          <td>${dt(r['Data Assinatura'])}</td>
          <td>${isNum(x.dias)?x.dias:'-'}</td>
          <td>${isNum(x.media)?fmtMi(x.media)+'/mês':'-'}</td>
          <td>${x.meses!==null?x.meses+(x.meses===1?' mês':' meses'):'-'}</td>
        </tr>`;
      }).join('');
  }

  const topMedia=valid.slice().sort((a,b)=>b.media-a.media).slice(0,15);
  if(document.getElementById('chMediaGlobal')){
    mkChart('chMediaGlobal','bar',{
      labels:topMedia.map(x=>String(x.r['Descrição']??x.r.Contrato??'').slice(0,34)),
      datasets:[{label:'R$ Mi/mês',data:topMedia.map(x=>+(x.media/1e6).toFixed(2)),backgroundColor:'#2e75b6'}]
    },{indexAxis:'y',plugins:{legend:{display:false}}});
  }

  const topMeses=rows.filter(x=>x.meses!==null).sort((a,b)=>a.meses-b.meses).slice(0,15);
  if(document.getElementById('chMesesRecursos')){
    mkChart('chMesesRecursos','bar',{
      labels:topMeses.map(x=>String(x.r['Descrição']??x.r.Contrato??'').slice(0,34)),
      datasets:[{label:'Meses',data:topMeses.map(x=>x.meses),backgroundColor:topMeses.map(x=>x.meses<3?'#c00000':'#70ad47')}]
    },{indexAxis:'y',plugins:{legend:{display:false}}});
  }
}

function renderAnalise(){
  preencherSelectAnalise();
  const rows=rowsAnalise();
  const fonte=rotuloAnalise();
  const totalValor=rows.reduce((a,r)=>a+(r['Valor Atual']||0),0);
  const empresas=new Set(rows.map(r=>r.Empresa).filter(Boolean));
  const contratos=new Set(rows.map(r=>fmtContrato(r.Contrato)).filter(Boolean));
  const kpi=document.getElementById('kpisAnalise');
  if(kpi){
    kpi.innerHTML=[
      ['Fonte da análise',fonte,''],
      ['Obras analisadas',rows.length,''],
      ['Empresas',empresas.size,''],
      ['Contratos',contratos.size,''],
      ['Valor Atual Total',fmtMi(totalValor),'']
    ].map(([l,v,c])=>`<div class="kpi ${c}"><div class="lbl">${l}</div><div class="val" style="font-size:18px">${v}</div></div>`).join('');
  }

  const topObras=rows.slice().sort((a,b)=>(b['Valor Atual']||0)-(a['Valor Atual']||0)).slice(0,15);
  const topObrasFull=topObras.map(r=>String(nomeCurtoObra(r)||r.Contrato||'Obra'));
  mkChart('chTopObrasValor','bar',{
    labels:topObrasFull.map(x=>wrapChartLabel(x,34,3)),
    datasets:[{label:'Valor Atual (R$ Mi)',data:topObras.map(r=>+((r['Valor Atual']||0)/1e6).toFixed(1)),backgroundColor:'#2e75b6'}]
  },{indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{title:items=>topObrasFull[items[0].dataIndex]||''}}},scales:{y:{afterFit:(scale)=>{scale.width=210;},ticks:{font:{size:9},autoSkip:false,crossAlign:'far',padding:6}}}});

  const byEmpresa={};
  rows.forEach(r=>{const e=r.Empresa||'(sem empresa)'; byEmpresa[e]=(byEmpresa[e]||0)+(r['Valor Atual']||0);});
  const topEmp=Object.entries(byEmpresa).sort((a,b)=>b[1]-a[1]).slice(0,15);
  const topEmpFull=topEmp.map(e=>e[0]);
  mkChart('chTopEmpresasValor','bar',{
    labels:topEmpFull.map(x=>wrapChartLabel(x,34,3)),
    datasets:[{label:'Valor Atual (R$ Mi)',data:topEmp.map(e=>+(e[1]/1e6).toFixed(1)),backgroundColor:'#1e4e79'}]
  },{indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{title:items=>topEmpFull[items[0].dataIndex]||''}}},scales:{y:{afterFit:(scale)=>{scale.width=210;},ticks:{font:{size:9},autoSkip:false,crossAlign:'far',padding:6}}}});

  const sm=rows.map(r=>({r,d:diasSemMedir(r)})).filter(x=>x.d!==null).sort((a,b)=>b.d-a.d).slice(0,15);
  const smFull=sm.map(x=>String(nomeCurtoObra(x.r)||x.r.Contrato||'Obra'));
  mkChart('chSemMedir','bar',{labels:smFull.map(x=>wrapChartLabel(x,36,3)),datasets:[{label:'Dias sem medir',
    data:sm.map(x=>x.d),backgroundColor:sm.map(x=>x.d>90?'#c00000':x.d>60?'#e67e22':'#2e75b6')}]},
    {indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{title:items=>smFull[items[0].dataIndex]||'',label:item=>'Dias sem medir: '+item.parsed.x}}},scales:{y:{afterFit:(scale)=>{scale.width=210;},ticks:{font:{size:9},autoSkip:false,crossAlign:'far',padding:6}}}});
  const b=[0,0,0,0];
  rows.forEach(r=>{const v=r.IDP;if(!isNum(v))return;
    if(v<0.7)b[0]++;else if(v<0.85)b[1]++;else if(v<=1)b[2]++;else b[3]++});
  mkChart('chIDP','bar',{labels:['IDP < 0,7','0,7 – 0,85','0,85 – 1','> 1'],datasets:[{label:'Obras',
    data:b,backgroundColor:['#c00000','#e67e22','#70ad47','#2e75b6']}]},
    {plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0,maxTicksLimit:6}}}});
  const projs=rows.map(r=>({r,p:projTermino(r)}))
    .filter(x=>x.p&&!x.p.concluida)
    .map(x=>{const bruto=Math.round((x.p.date-Date.now())/864e5);
      const fp=asDate(x.r['Fim Prazo']);
      const passou=bruto<0;
      const estoura=passou || (fp&&x.p.date>fp);
      return {...x,diasBruto:bruto,diasPlot:Math.max(1,Math.abs(bruto)),passou,estoura};})
    .sort((a,b)=>Math.abs(a.diasBruto)-Math.abs(b.diasBruto)).slice(0,15);
  const projFull=projs.map(x=>String(nomeCurtoObra(x.r)||x.r.Contrato||'Obra')+' — '+x.p.date.toLocaleDateString('pt-BR')+(x.passou?' (prazo projetado já passou)':''));
  mkChart('chProj','bar',{labels:projFull.map(x=>wrapChartLabel(x,36,3)),
    datasets:[{label:'Dias até/desde o término projetado',data:projs.map(x=>x.diasPlot),
      backgroundColor:projs.map(x=>x.estoura?'#c00000':'#2e75b6')}]},
    {indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{title:items=>projFull[items[0].dataIndex]||'',label:item=>{const x=projs[item.dataIndex];return x.passou?'Projetado há '+Math.abs(x.diasBruto)+' dia(s)':'Faltam '+x.diasBruto+' dia(s)';}}}},scales:{x:{beginAtZero:true},y:{afterFit:(scale)=>{scale.width=260;},ticks:{font:{size:8},autoSkip:false,crossAlign:'far',padding:8}}}});
  const crit=rows.filter(r=>(isNum(r.IDP)&&r.IDP<0.7)||((diasSemMedir(r)||0)>90));
  document.querySelector('#tblCrit tbody').innerHTML=crit.map(r=>{
    const m=mesesRecurso(r),d=diasSemMedir(r);
    return `<tr class="clickable" onclick="openObra('${esc(obraKey(r))}')">
      <td>${r['Descrição']??''}</td><td>${r['Solicitação']??''}</td><td>${r.Contrato??''}</td><td>${r.Empresa??''}</td>
      <td>${isNum(r.IDP)?r.IDP.toLocaleString('pt-BR',{maximumFractionDigits:2}):'-'}</td>
      <td>${d??'-'}</td><td>${m!==null?m+' meses':'-'}</td></tr>`}).join('');
}

function renderPlanilha(){
  if(!DATA.length)return;
  const cols=Object.keys(DATA[0]);
  document.querySelector('#tblFull thead').innerHTML='<tr>'+cols.map(c=>`<th>${c}</th>`).join('')+'</tr>';
  document.querySelector('#tblFull tbody').innerHTML=DATA.map(r=>'<tr>'+cols.map(c=>{
    let v=r[c];
    if(NUMCOLS.includes(c)&&isNum(v))v=v.toLocaleString('pt-BR',{maximumFractionDigits:2});
    else if(/^data|Fim |Data /i.test(c))v=dt(v);
    return `<td>${v??''}</td>`}).join('')+'</tr>').join('');
}

function exportarPDF(){window.print()}

function mkChart(id,type,data,opts){
  if(charts[id])charts[id].destroy();
  const options=Object.assign({responsive:true,maintainAspectRatio:false},opts||{});
  // Não forçar autoSkip:false em todos os eixos, pois isso sobrecarrega gráficos numéricos como IDP.
  // Cada gráfico horizontal da aba Análises define seus próprios rótulos e espaçamento.
  charts[id]=new Chart(document.getElementById(id),{type,data,options});
}

function wrapChartLabel(txt,max=34,maxLines=2){
  const words=String(txt??'').replace(/\s+/g,' ').trim().split(' ');
  const lines=[]; let cur='';
  words.forEach(w=>{
    if(!cur)cur=w;
    else if((cur+' '+w).length<=max)cur+=' '+w;
    else{lines.push(cur);cur=w;}
  });
  if(cur)lines.push(cur);
  if(lines.length>maxLines){
    const corte=lines.slice(0,maxLines);
    corte[maxLines-1]=corte[maxLines-1].replace(/…$/,'')+'…';
    return corte;
  }
  return lines.length?lines:[String(txt??'')];
}

function preencherSelectAnalise(){
  const s=document.getElementById('fAnaliseFonte'); if(!s)return;
  const atual=s.value||'__GERAL__';
  const opts=['<option value="__GERAL__">Análise — Geral ('+DATA.length+')</option>'];
  if(PORT.length)opts.push('<option value="__PORT__">Análise — Portfólio ('+PORT.length+')</option>');
  Object.keys(GRUPOS).filter(g=>!GRUPOS[g].arquivado).sort().forEach(g=>{
    const n=(GRUPOS[g]&&GRUPOS[g].obras?GRUPOS[g].obras.length:0);
    opts.push(`<option value="${esc(g)}">Grupo — ${esc(g)} (${n})</option>`);
    Object.keys((GRUPOS[g]&&GRUPOS[g].subgrupos)||{}).sort().forEach(sg=>{
      const sn=(((GRUPOS[g].subgrupos||{})[sg]||{}).obras||[]).length;
      opts.push(`<option value="${esc(g+'::'+sg)}">Subgrupo — ${esc(g)} / ${esc(sg)} (${sn})</option>`);
    });
  });
  s.innerHTML=opts.join('');
  if([...s.options].some(o=>o.value===atual))s.value=atual;
  else s.value='__GERAL__';
}

function rowsAnalise(){
  const sel=(document.getElementById('fAnaliseFonte')||{}).value||'__GERAL__';
  if(sel==='__PORT__')return PORT.length?PORT:DATA;
  if(sel && sel!=='__GERAL__'){
    if(sel.includes('::')){const [g,sg]=sel.split('::');const sub=((GRUPOS[g]||{}).subgrupos||{})[sg]||{};const ops=new Set(sub.obras||[]);return DATA.filter(r=>ops.has(groupKey(r))||ops.has(legacyOpusKey(r)));}
    if(GRUPOS[sel]&&!GRUPOS[sel].arquivado){const ops=new Set((GRUPOS[sel].obras||[]));return DATA.filter(r=>ops.has(groupKey(r))||ops.has(legacyOpusKey(r)));}
  }
  return DATA;
}

function rotuloAnalise(){
  const s=document.getElementById('fAnaliseFonte');
  return s && s.selectedIndex>=0 ? s.options[s.selectedIndex].textContent : 'Análise — Geral';
}

function opusDe(r){ return String(r['Solicitação']??'').trim(); }

function nomeCurtoObra(r){return r['Nome da Obra'] || r['Descrição'] || '';}

function aplicarNomesObras(rows){
  if(!rows||!rows.length)return;
  rows.forEach(r=>{
    const op=digits(r['Solicitação']);
    if(op && NOME_OBRA_MAP[op])r['Nome da Obra']=NOME_OBRA_MAP[op];
    else if(!('Nome da Obra' in r))r['Nome da Obra']='';
  });
}
function escHtml(v){
  return String(v??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function esc(s){return String(s??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}

/* ===================================================================
   PONTE SIGOM v31 — liga o motor de visualização do dashboard legado
   (KPIs, gráficos, Análises, Média Mensal Global, Saldos, Portfólio)
   aos dados vindos do Supabase (public/assets/app.js), que continua
   sendo o dono de: login, obras (grava/lê), grupos, FIO e admin.
   =================================================================== */

let SG_GROUP_MAP = new Map();      // nome do grupo -> Set(uuid da obra)
let SG_INITIALIZED = false;

/* Recebe as obras já carregadas do Supabase (array de linhas da tabela
   "obras", cada uma com .id e .dados = jsonb com as colunas originais
   da planilha) e roda o mesmo pipeline de normalização/consolidação
   do dashboard antigo. */
async function SG_setData(rows){
  const brutas = (rows||[]).map(r=>({...(r.dados||{}), _uuid:r.id}));
  DATA = consolidarObras(normalizeRows(brutas));
  aplicarNomesObras(DATA); aplicarNomesObras(PORT);
  dataDate = new Date();
  if(!SG_INITIALIZED){
    SG_INITIALIZED = true;
    initCollapsibleCards();
    initFieldPanel();
    initFilters();
  }
  initObraSelect();
  await sgPopularFiltroGrupos();
  preencherFiltroContratos();
  preencherSelectAnalise();
  render();
  if(curTab==='obra') renderObra(+((document.getElementById('selObra')||{}).value)||0);
  if(curTab==='analise') renderAnalise();
  if(curTab==='mediaGlobal') renderMediaMensalGlobal();
  if(curTab==='planilha') renderPlanilha();
}

/* Popula o filtro "Grupo" da Visão Geral usando os grupos reais do
   Supabase (não mais o localStorage do dashboard antigo). */
async function sgPopularFiltroGrupos(){
  const sel = document.getElementById('fGrupo');
  if(!sel || !window.SIGOM) return;
  const grupos = window.SIGOM.getGroups().filter(g=>!g.arquivado);
  SG_GROUP_MAP = await window.SIGOM.getGroupObraMap();
  const atual = sel.value;
  sel.innerHTML = '<option value="">Grupo — todos</option>'
    + (PORT.length?'<option value="__PORT__">📋 Portfólio Selecionado</option>':'')
    + grupos.map(g=>`<option value="${esc(g.nome)}">${esc(window.SIGOM.groupPath(g))}</option>`).join('');
  if(atual && [...sel.options].some(o=>o.value===atual)) sel.value = atual;
}

/* "Adicionar selecionadas ao grupo" — em vez do modal próprio do
   dashboard antigo, usa a página Grupos já existente e funcional do
   SIGOM v31 (Supabase). */
function adicionarSelecionadasAoGrupo(){
  if(!GRPSEL.size){ alert('Marque ao menos uma obra na coluna ☑ Grupo.'); return; }
  const ids = [...GRPSEL].map(k=>{
    const r = DATA.find(x=>groupKey(x)===k || legacyOpusKey(x)===k);
    return r && r._uuid;
  }).filter(Boolean);
  if(!ids.length){ alert('Não foi possível identificar as obras marcadas.'); return; }
  window.SIGOM.addWorksToGroupFlow(ids);
}

/* Botões que antes abriam fio_slide_SIGOM.html / objetivos.html em
   janela separada agora navegam para as páginas já existentes do
   SIGOM v31 (Supabase), pré-selecionando a obra/grupo quando possível. */
function abrirFIOExterno(){
  const idx = +((document.getElementById('selObra')||{}).value)||0;
  const r = (curTab==='obra' ? DATA[idx] : (filtered()[0]||DATA[0]));
  window.SIGOM.openFioForObra(r && r._uuid);
}
function abrirFIOExternoObra(){
  const idx = +((document.getElementById('selObra')||{}).value)||0;
  const r = DATA[idx];
  window.SIGOM.openFioForObra(r && r._uuid);
}
function abrirFIOGrupoSelecionado(){
  const g = (document.getElementById('fGrupo')||{}).value || '';
  if(!g || g==='__PORT__'){ alert('Selecione um grupo no filtro "Grupo" da Visão Geral.'); return; }
  const grupo = window.SIGOM.getGroups().find(x=>x.nome===g);
  if(!grupo){ alert('Grupo não encontrado.'); return; }
  window.SIGOM.openFioForGroup(grupo.id);
}
function salvarGruposNavegadorNoArquivo(){ window.SIGOM.showPage('groups'); }
let FIOCAR={};
function digits(v){return String(v??'').replace(/\D/g,'')}
function fioCaracteristicas(r){
  const opus=digits(r['Solicitação']);
  const base=FIOCAR[opus]||{};
  const g=(k1,k2)=>{ for(const k of [k1,k2]){ if(k && r[k]!=null && r[k]!=='')return r[k]; } return ''; };
  return {
    concepcao: base.concepcao || g('Concepção do Objeto','Concepção'),
    fundacoes: base.fundacoes || g('Fundações','Fundacoes'),
    estrutura: base.estrutura || g('Estrutura'),
    cobertura: base.cobertura || g('Cobertura'),
    paredes:   base.paredes   || g('Paredes Internas','Paredes'),
    terra:     base.terra     || g('Terraplenagem e Pavimentação','Terraplenagem'),
    pa:        base.pa        || (()=>{const v=String(g('PA','')).trim().toLowerCase(); if(['sim','s','x','1'].includes(v))return 'Sim'; if(['nao','não','n','0'].includes(v))return 'Não'; return ''})(),
    obs:       base.obs       || g('Observações','obs')
  };
}
function toggleSec(id){
  const row=document.getElementById(id), arr=document.getElementById('arr_'+id);
  if(!row)return;
  const aberto=row.style.display!=='none';
  row.style.display=aberto?'none':'';
  if(arr)arr.textContent=aberto?'▸':'▾';
  store.set('go_sec_'+id, aberto?'0':'1');
}
function menuObra(ev){ ev.preventDefault(); window.SIGOM.showPage('groups'); }
function fecharMenuObra(){ const m=document.getElementById('ctxObra'); if(m)m.remove(); }
document.addEventListener('click',fecharMenuObra);

function abrirGrupos(){ window.SIGOM.showPage('groups'); }
function menuObraDetalhe(){ window.SIGOM.showPage('groups'); }
function abrirObjetivosMetas(){ alert('O módulo "Objetivos e Metas" ainda não foi adaptado para o SIGOM v31 online. Use a versão HTML local por enquanto.'); }

/* Exportações que dependiam de Word/PPTX (pptxgenjs) ficam de fora
   desta primeira adaptação; a impressão via navegador continua ativa. */
function abrirExportTabela(){ window.print(); }
function abrirExportAnaliseWord(){ window.print(); }

/* Entrada dos uploads locais de Portfólio e Saldos Alongados — não há
   tabela no Supabase para isso ainda, então continuam sendo arquivos
   carregados no navegador (como no dashboard antigo), válidos durante
   a sessão. */
document.getElementById('portInput')?.addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ev => loadPort(ev.target.result, f.name);
  r.readAsArrayBuffer(f);
});
document.getElementById('saldoInput')?.addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ev => loadSaldos(ev.target.result, f.name);
  r.readAsArrayBuffer(f);
});

/* Upload local do mapa "Nome da Obra" (planilha Principais_Obras.xlsx:
   Nr Solicitação | Descrição/Nome-curto | RM, cabeçalho geralmente na
   linha 3). Sem tabela própria no Supabase ainda — vale para a sessão. */
function loadPrincipaisObras(buf,src){
  const wb=XLSX.read(buf,{type:'array',cellDates:true});
  const ws=wb.Sheets[wb.SheetNames[0]];
  const arr=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
  let header=-1;
  for(let i=0;i<arr.length;i++){
    const a=norm(arr[i][0]||''), b=norm(arr[i][1]||'');
    if((a.includes('solicitacao')||a.includes('opus')) && b.includes('descricao')){header=i;break;}
  }
  if(header<0)header=2;
  const mapa={};
  for(let i=header+1;i<arr.length;i++){
    const opus=digits(arr[i][0]);
    const nome=String(arr[i][1]||'').trim();
    if(opus&&nome)mapa[opus]=nome;
  }
  NOME_OBRA_MAP=mapa;
  aplicarNomesObras(DATA); aplicarNomesObras(PORT);
  if(DATA.length){render(); initObraSelect(); if(curTab==='analise')renderAnalise(); if(curTab==='planilha')renderPlanilha();}
  alert('Nomes de obra aplicados: '+Object.keys(mapa).length+' ('+src+')');
}
document.getElementById('principaisObrasInput')?.addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ev => loadPrincipaisObras(ev.target.result, f.name);
  r.readAsArrayBuffer(f);
});
