import { createClient } from '@supabase/supabase-js'

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})
const genericError=()=>json({error:'E-mail, nome de usuário ou senha inválidos.'},401)

export default async (req)=>{
  if(req.method!=='POST')return json({error:'Método não permitido'},405)
  const url=process.env.SUPABASE_URL
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY
  const publishableKey=process.env.SUPABASE_PUBLISHABLE_KEY
  if(!url||!serviceKey||!publishableKey)return json({error:'Serviço de autenticação não configurado.'},500)
  let body;try{body=await req.json()}catch{return genericError()}
  const identifier=String(body.identifier||'').trim().toLowerCase()
  const password=String(body.password||'')
  if(!identifier||!password)return genericError()
  try{
    let email=identifier
    const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
    if(!identifier.includes('@')){
      const {data:profile,error}=await service.from('profiles').select('id,ativo').ilike('username',identifier).maybeSingle()
      if(error||!profile||profile.ativo===false)return genericError()
      const {data,error:userError}=await service.auth.admin.getUserById(profile.id)
      if(userError||!data?.user?.email)return genericError()
      email=data.user.email
    }
    const publicClient=createClient(url,publishableKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data,error}=await publicClient.auth.signInWithPassword({email,password})
    if(error||!data?.session)return genericError()
    const {data:profile}=await service.from('profiles').select('ativo').eq('id',data.user.id).maybeSingle()
    if(profile?.ativo===false){await publicClient.auth.signOut();return genericError()}
    return json({access_token:data.session.access_token,refresh_token:data.session.refresh_token,expires_in:data.session.expires_in})
  }catch{return genericError()}
}
export const config={path:'/.netlify/functions/login-identifier'}
