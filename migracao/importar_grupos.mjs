import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';

const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key) throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY somente no terminal local.');
const supabase=createClient(url,key,{auth:{persistSession:false}});
const origem=JSON.parse(await readFile(new URL('./grupos_obras_original.json',import.meta.url),'utf8'));

const reparar=s=>{
  let out=String(s??'');
  for(let i=0;i<5 && /Ã|Â|â€|Æ/.test(out);i++){
    try{out=decodeURIComponent(escape(out));}catch{break;}
  }
  return out.normalize('NFC');
};

const grupos=Array.isArray(origem.grupos)?origem.grupos:[];
for(const g of grupos){
  const nome=reparar(g.nome).trim();
  const {data:grupo,error}=await supabase.from('grupos').upsert({
    nome,descricao:reparar(g.descricao||''),arquivado:!!g.arquivado,
    arquivado_em:g.arquivadoEm||null
  },{onConflict:'nome,grupo_pai_id'}).select().single();
  if(error){console.error(nome,error.message);continue;}
  for(const chave of g.obras||[]){
    const [opus,...rest]=String(chave).split('|'); const contrato=rest.join('|');
    const {data:obra}=await supabase.from('obras').select('id').eq('opus',opus).eq('contrato',contrato).maybeSingle();
    if(obra) await supabase.from('grupo_obras').upsert({grupo_id:grupo.id,obra_id:obra.id});
  }
  console.log('Importado:',nome);
}
