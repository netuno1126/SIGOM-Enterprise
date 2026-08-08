(()=>{
const CFG=window.SIGOM_CONFIG;
async function unread(){
 try{
  if(!CFG||!window.supabase)return 0;
  const db=supabase.createClient(CFG.supabaseUrl,CFG.supabasePublishableKey);
  const {count,error}=await db.from('alertas_medicao').select('*',{count:'exact',head:true}).eq('lido',false);
  return error?0:(count||0);
 }catch{return 0}
}
function addButton(label,url,id){
 const tabs=document.querySelector('.tabs');if(!tabs||document.getElementById(id))return null;
 const b=document.createElement('button');b.type='button';b.id=id;b.onclick=()=>location.href=url;b.textContent=label;
 const right=tabs.querySelector('.right');right?tabs.insertBefore(b,right):tabs.appendChild(b);return b;
}
function addMenu(label,url){
 document.querySelectorAll('.dropcontent').forEach(m=>{
  if([...m.querySelectorAll('button')].some(b=>b.textContent.includes(label)))return;
  const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>location.href=url;m.appendChild(b);
 });
}
async function boot(){
 const a=addButton('🔔 Atualizações de Medição','/app/alertas-medicao.html','sigomAlertasMedicaoBtn');
 addButton('Visão do Diretor','/app/visao-diretor.html','sigomVisaoDiretorBtn');
 addButton('💡 Caixa de Sugestões','/app/sugestoes.html','sigomSugestoesBtn');
 addMenu('Atualizações de Medição','/app/alertas-medicao.html');addMenu('Visão do Diretor','/app/visao-diretor.html');addMenu('Caixa de Sugestões','/app/sugestoes.html');
 const c=await unread();if(a&&c>0){a.textContent=`🔔 Atualizações de Medição (${c})`;a.style.background='#c00000';a.style.color='#fff'}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();