import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const [,,jsonPath='grupos_obras_original.json']=process.argv;
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key) throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no terminal.');
const db=createClient(url,key,{auth:{persistSession:false}});
const source=JSON.parse(fs.readFileSync(jsonPath,'utf8'));
const grupos=Array.isArray(source)?source:(source.grupos||[]);
const norm=s=>String(s??'').normalize('NFC').trim();
const contract=s=>norm(s).replace(/\.0$/,'');
let imported=0,linked=0,missing=[];
for(const raw of grupos){
  const {data:g,error}=await db.from('grupos').upsert({nome:norm(raw.nome),descricao:norm(raw.descricao),arquivado:!!raw.arquivado,arquivado_em:raw.arquivadoEm||null},{onConflict:'nome'}).select().single();
  if(error){console.error('Grupo',raw.nome,error.message);continue;} imported++;
  for(const chave of raw.obras||[]){const [opus,contrato='']=String(chave).split('|');const {data:w}=await db.from('obras').select('id').eq('opus',norm(opus)).eq('contrato',contract(contrato)).maybeSingle();if(!w){missing.push(chave);continue;}const {error:le}=await db.from('grupo_obras').upsert({grupo_id:g.id,obra_id:w.id},{onConflict:'grupo_id,obra_id',ignoreDuplicates:true});if(!le)linked++;}
  for(const [subNome,subRaw] of Object.entries(raw.subgrupos||{})){const sub=typeof subRaw==='object'?subRaw:{obras:[]};const {data:sg,error:se}=await db.from('grupos').upsert({nome:norm(sub.nome||subNome),descricao:norm(sub.descricao),grupo_pai_id:g.id,arquivado:!!sub.arquivado},{onConflict:'grupo_pai_id,nome'}).select().single();if(se){console.error('Subgrupo',subNome,se.message);continue;}for(const chave of sub.obras||[]){const [opus,contrato='']=String(chave).split('|');const {data:w}=await db.from('obras').select('id').eq('opus',norm(opus)).eq('contrato',contract(contrato)).maybeSingle();if(!w){missing.push(chave);continue;}const {error:le}=await db.from('grupo_obras').upsert({grupo_id:sg.id,obra_id:w.id},{onConflict:'grupo_id,obra_id',ignoreDuplicates:true});if(!le)linked++;}}
}
console.log(JSON.stringify({grupos_importados:imported,vinculos_criados:linked,obras_nao_encontradas:[...new Set(missing)]},null,2));
