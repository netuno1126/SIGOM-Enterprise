(()=>{
function addButton(label,url){
 const tabs=document.querySelector('.tabs'); if(!tabs) return;
 if([...tabs.querySelectorAll('button')].some(b=>b.textContent.trim()===label)) return;
 const b=document.createElement('button'); b.type='button'; b.textContent=label; b.onclick=()=>location.href=url;
 const right=tabs.querySelector('.right'); if(right) tabs.insertBefore(b,right); else tabs.appendChild(b);
}
function addMenuLink(label,url){
 document.querySelectorAll('.dropcontent').forEach(m=>{
   if([...m.querySelectorAll('button')].some(b=>b.textContent.includes(label))) return;
   const b=document.createElement('button'); b.type='button'; b.textContent=label; b.onclick=()=>location.href=url; m.appendChild(b);
 });
}
function boot(){
 addButton('🔔 Atualizações de Medição','/app/alertas-medicao.html');
 addButton('Visão do Diretor','/app/visao-diretor.html');
 addMenuLink('Atualizações de Medição','/app/alertas-medicao.html');
 addMenuLink('Visão do Diretor','/app/visao-diretor.html');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();