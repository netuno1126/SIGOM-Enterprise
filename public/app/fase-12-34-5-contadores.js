(()=>{
  async function obterCliente(){
    try{
      if(!window.supabase || !window.SIGOM_CONFIG) return null;
      const cfg=window.SIGOM_CONFIG;
      const url=cfg.supabaseUrl || cfg.SUPABASE_URL || cfg.url;
      const key=cfg.supabasePublishableKey || cfg.SUPABASE_PUBLISHABLE_KEY || cfg.publishableKey || cfg.anonKey;
      if(!url || !key) return null;
      return window.supabase.createClient(url,key);
    }catch(e){ return null; }
  }
  async function atualizar(){
    const db=await obterCliente();
    if(!db) return;
    try{
      const {count,error}=await db.from('alertas_medicao')
        .select('*',{count:'exact',head:true})
        .eq('lido',false);
      if(error) return;
      const n=Number(count||0);
      ['menuAlertasBadge','menuAlertasBadgeOBJ','tabAlertasBadge'].forEach(id=>{
        const el=document.getElementById(id);
        if(el) el.textContent=n>0?`(${n})`:'';
      });
      ['menuAlertasMedicao','menuAlertasMedicaoOBJ','tabAlertasMedicao'].forEach(id=>{
        const el=document.getElementById(id);
        if(el && n>0){
          el.style.background='#c00000';
          el.style.color='#fff';
        }
      });
    }catch(e){}
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(atualizar,400));
  }else setTimeout(atualizar,400);
})();