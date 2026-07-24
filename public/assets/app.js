import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.SIGOM_CONFIG;
const supabase = createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = id => document.getElementById(id);
let pendingFactorId = null;

function show(view){ ['loginView','mfaView','appView'].forEach(id=>$(id).classList.toggle('hidden',id!==view)); }
function message(id,text=''){ $(id).textContent=text; }

async function getProfile(userId){
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if(error) throw error;
  return data;
}

async function routeSession(session){
  if(!session){ show('loginView'); return; }
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const verified = factorsData?.totp?.find(f=>f.status==='verified');
  if(verified && aalData?.currentLevel !== 'aal2'){
    pendingFactorId = verified.id;
    $('enrollMfaBtn').classList.add('hidden');
    $('mfaQrWrap').classList.add('hidden');
    show('mfaView');
    return;
  }
  await loadApp(session.user, aalData?.currentLevel || 'aal1');
}

async function loadApp(user, aal){
  const profile = await getProfile(user.id);
  $('versionLabel').textContent = `V${cfg.version}`;
  $('welcomeTitle').textContent = `Bem-vindo, ${profile.nome || user.email}`;
  $('profileSummary').textContent = `Perfil: ${profile.perfil} · ${user.email}`;
  $('adminNav').classList.toggle('hidden', profile.perfil !== 'administrador');
  $('aalStatus').textContent = String(aal).toUpperCase();
  const [{count:works},{count:groups},{count:fio}] = await Promise.all([
    supabase.from('obras').select('*',{count:'exact',head:true}),
    supabase.from('grupos').select('*',{count:'exact',head:true}).eq('arquivado',false),
    supabase.from('fio_edicoes').select('*',{count:'exact',head:true})
  ]);
  $('worksCount').textContent=works||0; $('groupsCount').textContent=groups||0; $('fioCount').textContent=fio||0;
  show('appView');
}

$('loginForm').addEventListener('submit', async e=>{
  e.preventDefault(); message('loginMessage','Entrando...');
  const { data, error } = await supabase.auth.signInWithPassword({ email:$('email').value.trim(), password:$('password').value });
  if(error){ message('loginMessage',error.message); return; }
  message('loginMessage',''); await routeSession(data.session);
});

$('mfaForm').addEventListener('submit', async e=>{
  e.preventDefault(); message('mfaMessage','Verificando...');
  const code=$('mfaCode').value.trim();
  if(!pendingFactorId){ message('mfaMessage','Fator MFA não identificado.'); return; }
  const { data:challenge,error:challengeError }=await supabase.auth.mfa.challenge({factorId:pendingFactorId});
  if(challengeError){message('mfaMessage',challengeError.message);return;}
  const { error }=await supabase.auth.mfa.verify({factorId:pendingFactorId,challengeId:challenge.id,code});
  if(error){message('mfaMessage',error.message);return;}
  const {data:{session}}=await supabase.auth.getSession(); await routeSession(session);
});

$('enrollMfaBtn').addEventListener('click', async ()=>{
  const {data,error}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'SIGOM Enterprise'});
  if(error){message('mfaMessage',error.message);return;}
  pendingFactorId=data.id;
  $('mfaQr').src=data.totp.qr_code;
  $('mfaSecret').textContent=data.totp.secret;
  $('mfaQrWrap').classList.remove('hidden');
  $('mfaText').textContent='Escaneie o QR Code e depois informe o código de 6 dígitos.';
});

$('logoutBtn').addEventListener('click', async()=>{await supabase.auth.signOut();show('loginView');});

supabase.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>routeSession(session).catch(e=>message('loginMessage',e.message)),0)});
const {data:{session}}=await supabase.auth.getSession();
if(session){
  const {data:factors}=await supabase.auth.mfa.listFactors();
  if(!factors?.totp?.some(f=>f.status==='verified')) $('enrollMfaBtn').classList.remove('hidden');
}
await routeSession(session);
