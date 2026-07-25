import { createClient } from '@supabase/supabase-js';

const text=v=>String(v??'').normalize('NFC').trim();
const keyText=v=>text(v).replace(/\s+/g,' ').toLowerCase();
function repair(v){
  if(Array.isArray(v)) return v.map(repair);
  if(v&&typeof v==='object') return Object.fromEntries(Object.entries(v).map(([k,val])=>[repairString(k),repair(val)]));
  return typeof v==='string'?repairString(v):v;
}
function repairString(v){
  let s=String(v).normalize('NFC');
  const score=x=>(x.match(/[ÃÂ�]/g)||[]).length;
  for(let i=0;i<3;i++){
    try{
      const bytes=Uint8Array.from([...s].map(c=>c.charCodeAt(0)&255));
      const fixed=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
      if(score(fixed)<score(s)) s=fixed; else break;
    }catch{break;}
  }
  return s.normalize('NFC').trim();
}
async function adminClient(request){
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token) throw Object.assign(new Error('Não autenticado'),{status:401});
  const admin=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const {data:{user},error}=await admin.auth.getUser(token);
  if(error||!user) throw Object.assign(new Error('Sessão inválida'),{status:401});
  const {data:p}=await admin.from('profiles').select('perfil').eq('id',user.id).single();
  if(p?.perfil!=='administrador') throw Object.assign(new Error('Acesso restrito ao administrador'),{status:403});
  return {admin,user};
}
function flattenGroups(raw){
  const source=Array.isArray(raw)?raw:(Array.isArray(raw?.grupos)?raw.grupos:[]);
  const out=[];
  const walk=(g,parentRef=null)=>{
    if(!g||!text(g.nome)) return;
    const ref=`${parentRef||'root'}::${keyText(g.nome)}`;
    out.push({ref,parentRef,nome:text(g.nome),descricao:text(g.descricao),arquivado:Boolean(g.arquivado),arquivadoEm:text(g.arquivadoEm)||null,obras:Array.isArray(g.obras)?g.obras:[]});
    const sub=g.subgrupos;
    if(Array.isArray(sub)) sub.forEach(x=>walk(x,ref));
    else if(sub&&typeof sub==='object') Object.entries(sub).forEach(([nome,val])=>walk(typeof val==='object'?{nome,...val}:{nome,obras:Array.isArray(val)?val:[]},ref));
  };
  source.forEach(g=>walk(g));
  return out;
}
function splitWorkRef(v){
  if(v&&typeof v==='object') return {opus:text(v.opus||v.nr_opus||v.numero_opus),contrato:text(v.contrato||v.nr_contrato)};
  const s=text(v); const i=s.indexOf('|');
  return i<0?{opus:s,contrato:''}:{opus:text(s.slice(0,i)),contrato:text(s.slice(i+1))};
}
export default async request=>{
  try{
    if(request.method!=='POST') return new Response('Método não permitido',{status:405});
    const {admin,user}=await adminClient(request);
    const body=repair(await request.json());
    const flat=flattenGroups(body.data);
    if(!flat.length) throw new Error('Nenhum grupo válido foi encontrado no arquivo.');
    const {data:works,error:we}=await admin.from('obras').select('id,opus,contrato'); if(we) throw we;
    const workMap=new Map((works||[]).map(w=>[`${keyText(w.opus)}|${keyText(w.contrato)}`,w.id]));
    const refToId=new Map(); const importedIds=[]; let created=0,updated=0,subgroups=0,links=0; const missing=[];
    for(const g of flat){
      const parentId=g.parentRef?refToId.get(g.parentRef)||null:null;
      let query=admin.from('grupos').select('id').eq('nome',g.nome);
      query=parentId?query.eq('grupo_pai_id',parentId):query.is('grupo_pai_id',null);
      const {data:existing,error:ee}=await query.maybeSingle(); if(ee) throw ee;
      const payload={nome:g.nome,descricao:g.descricao,grupo_pai_id:parentId,arquivado:g.arquivado,arquivado_em:g.arquivadoEm||null,atualizado_por:user.id,atualizado_em:new Date().toISOString()};
      let row;
      if(existing){const {data,error}=await admin.from('grupos').update(payload).eq('id',existing.id).select('id').single();if(error)throw error;row=data;updated++;}
      else {const {data,error}=await admin.from('grupos').insert({...payload,criado_por:user.id}).select('id').single();if(error)throw error;row=data;created++;}
      refToId.set(g.ref,row.id); importedIds.push(row.id); if(parentId) subgroups++;
      const linkRows=[];
      for(const item of g.obras){const {opus,contrato}=splitWorkRef(item);const obraId=workMap.get(`${keyText(opus)}|${keyText(contrato)}`);if(obraId)linkRows.push({grupo_id:row.id,obra_id:obraId,adicionado_por:user.id});else missing.push({grupo:g.nome,opus,contrato});}
      if(linkRows.length){const {error}=await admin.from('grupo_obras').upsert(linkRows,{onConflict:'grupo_id,obra_id',ignoreDuplicates:true});if(error)throw error;links+=linkRows.length;}
    }
    if(body.replaceMissing&&importedIds.length){
      const {data:allGroups,error}=await admin.from('grupos').select('id').eq('arquivado',false);if(error)throw error;
      const toArchive=(allGroups||[]).map(x=>x.id).filter(id=>!importedIds.includes(id));
      if(toArchive.length){const {error:ae}=await admin.from('grupos').update({arquivado:true,arquivado_em:new Date().toISOString(),atualizado_por:user.id,atualizado_em:new Date().toISOString()}).in('id',toArchive);if(ae)throw ae;}
    }
    await admin.from('auditoria_logs').insert({usuario_id:user.id,acao:'IMPORTAR_GRUPOS_JSON',entidade:'grupos',depois:{grupos:flat.length,criados:created,atualizados:updated,subgrupos,links,nao_encontradas:missing.length}});
    return Response.json({ok:true,groups:flat.length,created,updated,subgroups,links,missing});
  }catch(e){return Response.json({error:e.message},{status:e.status||400});}
};
