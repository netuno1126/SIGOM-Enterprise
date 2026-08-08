(()=>{
function addDashboardMenu(){
  const menus=document.querySelectorAll('.dropcontent');
  menus.forEach(m=>{
    const add=(label,url)=>{
      if([...m.querySelectorAll('button')].some(b=>b.textContent.includes(label))) return;
      const b=document.createElement('button');
      b.type='button'; b.textContent=label;
      b.onclick=()=>{ window.location.href=url; if(typeof closeDrops==='function')closeDrops(); };
      const conta=[...m.children].find(x=>x.classList?.contains('dropsec') && /conta/i.test(x.textContent));
      if(conta) m.insertBefore(b,conta); else m.appendChild(b);
    };
    add('🔔 Atualizações de Medição','/app/alertas-medicao.html');
    add('💡 Caixa de Sugestões','/app/sugestoes.html');
  });
}
function addObjetivosTabs(){
  const tabs=document.querySelector('.tabs');
  if(!tabs)return;
  const add=(label,url,id)=>{
    if(document.getElementById(id))return;
    const b=document.createElement('button');b.id=id;b.type='button';b.textContent=label;b.onclick=()=>location.href=url;
    const right=tabs.querySelector('.right'); right?tabs.insertBefore(b,right):tabs.appendChild(b);
  };
  add('Visão do Diretor','/app/visao-diretor.html','sigomVisaoDiretor');
  add('🔔 Medições','/app/alertas-medicao.html','sigomAlertasObjetivos');
}
function addObjetivosMenu(){
  document.querySelectorAll('.dropcontent').forEach(m=>{
    const add=(label,url)=>{
      if([...m.querySelectorAll('button')].some(b=>b.textContent.includes(label)))return;
      const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>location.href=url;
      m.appendChild(b);
    };
    add('Visão do Diretor','/app/visao-diretor.html');
    add('Atualizações de Medição','/app/alertas-medicao.html');
  });
}
async function updateUnread(){
 try{
  if(!window.SIGOM_CONFIG||!window.supabase)return;
  const db=supabase.createClient(SIGOM_CONFIG.supabaseUrl,SIGOM_CONFIG.supabasePublishableKey);
  const {count}=await db.from('alertas_medicao').select('*',{count:'exact',head:true}).eq('lido',false);
  if(count>0){
   document.querySelectorAll('button').forEach(b=>{
    if(b.textContent.includes('Atualizações de Medição')||b.textContent==='🔔 Medições'){
      if(!/\(\d+\)/.test(b.textContent)) b.textContent=b.textContent.replace(/(\s*)$/,'')+` (${count})`;
      b.style.background='#c00000';b.style.color='#fff';
    }
   });
  }
 }catch(e){}
}
function boot(){ addDashboardMenu();addObjetivosTabs();addObjetivosMenu();updateUnread(); }
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
setTimeout(boot,700);
})();