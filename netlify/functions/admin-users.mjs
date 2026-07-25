import { createClient } from '@supabase/supabase-js'

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8'}})
export default async (req)=>{
  if(req.method!=='POST')return json({error:'Método não permitido'},405)
  const url=process.env.SUPABASE_URL
  const service=process.env.SUPABASE_SERVICE_ROLE_KEY
  const publishable=process.env.SUPABASE_PUBLISHABLE_KEY
  if(!url||!service||!publishable)return json({error:'Variáveis do Supabase não configuradas'},500)
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'')
  if(!token)return json({error:'Sessão ausente'},401)
  const authClient=createClient(url,publishable,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}})
  const {data:{user},error:userError}=await authClient.auth.getUser(token)
  if(userError||!user)return json({error:'Sessão inválida'},401)
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data:profile}=await admin.from('profiles').select('perfil,ativo').eq('id',user.id).maybeSingle()
  if(!profile||profile.ativo===false||profile.perfil!=='administrador')return json({error:'Acesso exclusivo do administrador'},403)
  let body;try{body=await req.json()}catch{return json({error:'JSON inválido'},400)}
  try{
    if(body.action==='list'){
      const {data,error}=await admin.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error
      const ids=data.users.map(u=>u.id);const {data:profiles,error:pe}=await admin.from('profiles').select('id,nome,perfil,ativo').in('id',ids);if(pe)throw pe
      const map=new Map((profiles||[]).map(p=>[p.id,p]));return json({users:data.users.map(u=>({id:u.id,email:u.email,last_sign_in_at:u.last_sign_in_at,...(map.get(u.id)||{perfil:'consulta',ativo:true})}))})
    }
    if(body.action==='create'){
      if(!body.email||!body.password)return json({error:'E-mail e senha são obrigatórios'},400)
      const {data,error}=await admin.auth.admin.createUser({email:body.email,password:body.password,email_confirm:true,user_metadata:{nome:body.nome||''}});if(error)throw error
      const {error:pe}=await admin.from('profiles').upsert({id:data.user.id,nome:body.nome||body.email,perfil:body.perfil||'consulta',ativo:true});if(pe)throw pe
      return json({ok:true,userId:data.user.id})
    }
    if(body.action==='update'){
      if(!body.userId)return json({error:'userId obrigatório'},400)
      const patch={atualizado_em:new Date().toISOString()};if(body.perfil)patch.perfil=body.perfil;if(typeof body.ativo==='boolean')patch.ativo=body.ativo
      const {error}=await admin.from('profiles').update(patch).eq('id',body.userId);if(error)throw error
      return json({ok:true})
    }
    return json({error:'Ação desconhecida'},400)
  }catch(e){return json({error:e.message||'Erro interno'},500)}
}
export const config={path:'/.netlify/functions/admin-users'}
