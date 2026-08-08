(()=>{
const MAX_MONTHS=360;
const toNum=v=>{if(v==null||v==='')return null;if(typeof v==='number')return Number.isFinite(v)?v:null;let s=String(v).trim().replace(/R\$/gi,'').replace(/\s/g,'');if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const n=Number(s.replace('%',''));return Number.isFinite(n)?n:null};
const fmtMonths=m=>m<1?'menos de 1 mês':`${Math.round(m)} ${Math.round(m)===1?'mês':'meses'}`;
function safeDateMonths(months){
 if(!Number.isFinite(months)||months<0||months>MAX_MONTHS)return null;
 const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+Math.round(months));return d;
}
function calcFinancial(o){
 const ne=toNum(o.total_ne??o['Total NE']),nf=toNum(o.total_notas_fiscais??o.total_nf??o['Total Notas Fiscais']);
 const saldo=(ne!=null&&nf!=null)?Math.max(0,ne-nf):toNum(o.saldo_empenho??o['saldo de empenho']);
 let ritmo=toNum(o.media_liq_3??o.media_liquidacao_3??o['Média liq. 3 últimas medições']);
 if(!(ritmo>0)) ritmo=toNum(o.media_mensal_global??o['media mensal global']);
 if(saldo==null)return {texto:'Não estimável',motivo:'Saldo financeiro indisponível'};
 if(saldo<=0)return {texto:'0 meses',motivo:'Recursos totalmente liquidados'};
 if(!(ritmo>0) || ritmo>1e9)return {texto:'Não estimável',motivo:'Ritmo financeiro recente insuficiente'};
 const meses=saldo/ritmo,dt=safeDateMonths(meses);
 if(!dt)return {texto:'Superior a 30 anos',motivo:'Ritmo financeiro insuficiente'};
 return {texto:`${fmtMonths(meses)} · ${dt.toLocaleDateString('pt-BR')}`,meses,data:dt};
}
function sanitize(){
 const nodes=[...document.querySelectorAll('body *')].filter(e=>e.children.length===0);
 nodes.forEach(el=>{
  const t=el.textContent.trim();
  if(/Invalid Date/i.test(t)||/\b(?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\/(?:[3-9]\d{3,}|[1-9]\d{4,})\b/.test(t)){
    el.textContent='Não estimável';
    el.title='Projeção bloqueada pela validação de engenharia da Fase 12.34.2';
  }
 });
}
window.SIGOM_CALC_DURACAO_RECURSOS_12342=calcFinancial;
const obs=new MutationObserver(()=>sanitize());if(document.body)obs.observe(document.body,{subtree:true,childList:true,characterData:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sanitize);else sanitize();
})();