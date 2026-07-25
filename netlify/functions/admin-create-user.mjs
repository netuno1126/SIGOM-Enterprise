import { createClient } from '@supabase/supabase-js';

export default async (request) => {
  if(request.method!=='POST') return new Response('Método não permitido',{status:405});
  const auth=request.headers.get('authorization')||'';
  const token=auth.replace(/^Bearer\s+/i,'');
  if(!token) return Response.json({error:'Não autenticado'},{status:401});

  const url=process.env.SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin=createClient(url,serviceKey,{auth:{persistSession:false}});
  const {data:{user},error:userError}=await admin.auth.getUser(token);
  if(userError||!user) return Response.json({error:'Sessão inválida'},{status:401});
  const {data:profile}=await admin.from('profiles').select('perfil').eq('id',user.id).single();
  if(profile?.perfil!=='administrador') return Response.json({error:'Acesso negado'},{status:403});

  const body=await request.json();
  const {data,error}=await admin.auth.admin.createUser({email:body.email,password:body.password,email_confirm:true,user_metadata:{nome:body.nome}});
  if(error) return Response.json({error:error.message},{status:400});
  if(body.perfil) await admin.from('profiles').update({perfil:body.perfil,nome:body.nome}).eq('id',data.user.id);
  return Response.json({ok:true,user_id:data.user.id});
};
