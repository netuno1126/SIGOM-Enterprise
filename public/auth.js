const cfg=window.SIGOM_CONFIG;
const client=supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const statusEl=document.getElementById('status');
let pendingFactor=null;
const setStatus=(m)=>statusEl.textContent=m||'';

async function redirectIfReady(){
  const {data:{session}}=await client.auth.getSession();
  if(!session)return false;
  const {data}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(!cfg.requireMfa||data.currentLevel==='aal2'){
    location.replace('/app.html');
    return true;
  }
  return false;
}

async function prepareMfa(){
  document.getElementById('loginForm').hidden=true;
  document.getElementById('mfaBox').hidden=false;
  const {data:list,error}=await client.auth.mfa.listFactors();
  if(error)throw error;
  const verified=(list?.totp||[]).find(f=>f.status==='verified');
  if(verified){pendingFactor=verified.id;return;}
  const {data,error:enrollError}=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'SIGOM'});
  if(enrollError)throw enrollError;
  pendingFactor=data.id;
  document.getElementById('enrollBox').hidden=false;
  document.getElementById('qr').innerHTML=data.totp.qr_code;
}

async function loginWithIdentifier(identifier,password){
  const response=await fetch('/.netlify/functions/login-identifier',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({identifier,password})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||'Não foi possível autenticar.');
  const {error}=await client.auth.setSession({
    access_token:result.access_token,
    refresh_token:result.refresh_token
  });
  if(error)throw error;
}

document.getElementById('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  setStatus('Autenticando...');
  const identifier=document.getElementById('identifier').value.trim();
  const password=document.getElementById('password').value;
  try{
    await loginWithIdentifier(identifier,password);
    if(!(await redirectIfReady()))await prepareMfa();
    setStatus('Informe o código do autenticador.');
  }catch(err){
    setStatus(err.message||'E-mail, usuário ou senha inválidos.');
  }
});

document.getElementById('verifyBtn').addEventListener('click',async()=>{
  setStatus('Validando...');
  const code=document.getElementById('totp').value.trim();
  const {data:challenge,error:cErr}=await client.auth.mfa.challenge({factorId:pendingFactor});
  if(cErr){setStatus(cErr.message);return;}
  const {error}=await client.auth.mfa.verify({factorId:pendingFactor,challengeId:challenge.id,code});
  if(error){setStatus(error.message);return;}
  location.replace('/app.html');
});

redirectIfReady();
