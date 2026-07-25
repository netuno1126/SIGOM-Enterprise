import { createClient } from '@supabase/supabase-js';

// Serve o dashboard clássico (index.html / SIGOM_Mobile.html) sem alterar
// nenhuma linha dele: aqui reproduzimos o mesmo contrato de /api/grupos
// que o servidor local (PowerShell/Node) sempre respondeu, mas gravando
// e lendo das tabelas do Supabase (grupos, grupo_obras, obras).
//
// Como o dashboard clássico tem login/sessão próprios (não usa o Supabase
// Auth do SIGOM v31), esta função usa a service role no servidor — o
// controle de quem pode editar continua sendo feito no próprio dashboard
// (isAdminSIGOM()). Não é uma autenticação forte; é compatibilidade.

const admin = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const text = v => String(v ?? '').normalize('NFC').trim();

// Monta a chave de obra usada nos grupos: aqui usamos só o Nº OPUS
// (equivalente a legacyOpusKey() no front-end), que é aceito como
// alternativa a "OPUS|Contrato" em todas as buscas do dashboard.
function chaveObra(o) { return text(o.opus); }

async function montarGruposLista(db) {
  const { data: grupos, error: ge } = await db.from('grupos').select('id,nome,descricao,grupo_pai_id,arquivado,arquivado_em,criado_em,criado_por').order('nome');
  if (ge) throw ge;
  const { data: links, error: le } = await db.from('grupo_obras').select('grupo_id,obras(opus)');
  if (le) throw le;
  const { data: perfis } = await db.from('profiles').select('id,nome');
  const nomePorId = new Map((perfis || []).map(p => [p.id, p.nome]));

  const obrasPorGrupo = new Map();
  (links || []).forEach(l => {
    if (!l.obras) return;
    const k = chaveObra(l.obras);
    if (!k) return;
    if (!obrasPorGrupo.has(l.grupo_id)) obrasPorGrupo.set(l.grupo_id, []);
    obrasPorGrupo.get(l.grupo_id).push(k);
  });

  const porId = new Map((grupos || []).map(g => [g.id, g]));
  const filhosDe = new Map();
  (grupos || []).forEach(g => {
    const pai = g.grupo_pai_id || 'root';
    if (!filhosDe.has(pai)) filhosDe.set(pai, []);
    filhosDe.get(pai).push(g);
  });

  const montarGrupo = g => ({
    nome: g.nome,
    descricao: g.descricao || '',
    criadoEm: g.criado_em || '',
    criadoPor: nomePorId.get(g.criado_por) || '',
    criador: nomePorId.get(g.criado_por) || '',
    obras: obrasPorGrupo.get(g.id) || [],
    subgrupos: Object.fromEntries((filhosDe.get(g.id) || []).map(sg => [sg.nome, montarGrupo(sg)])),
    arquivado: !!g.arquivado,
    arquivadoEm: g.arquivado_em || '',
  });

  return (filhosDe.get('root') || []).map(montarGrupo);
}

async function sincronizarGrupos(db, payload) {
  const lista = Array.isArray(payload?.grupos) ? payload.grupos : [];
  if (!lista.length) return { criados: 0, atualizados: 0, subgrupos: 0, vinculos: 0, naoEncontradas: [] };

  const { data: obras, error: oe } = await db.from('obras').select('id,opus,contrato');
  if (oe) throw oe;
  const porOpus = new Map();
  (obras || []).forEach(o => {
    const k = chaveObra(o);
    if (!k) return;
    if (!porOpus.has(k)) porOpus.set(k, []);
    porOpus.get(k).push(o.id);
  });
  const resolverObra = chave => { const arr = porOpus.get(text(chave)); return arr && arr.length ? arr[0] : null; };

  let criados = 0, atualizados = 0, subgrupos = 0, vinculos = 0;
  const naoEncontradas = [];

  async function upsertGrupo(g, paiId) {
    let query = db.from('grupos').select('id').eq('nome', g.nome);
    query = paiId ? query.eq('grupo_pai_id', paiId) : query.is('grupo_pai_id', null);
    const { data: existente, error: ee } = await query.maybeSingle();
    if (ee) throw ee;
    const linha = {
      nome: g.nome, descricao: g.descricao || '', grupo_pai_id: paiId || null,
      arquivado: !!g.arquivado, arquivado_em: g.arquivadoEm || null,
      atualizado_em: new Date().toISOString(),
    };
    let id;
    if (existente) {
      const { data, error } = await db.from('grupos').update(linha).eq('id', existente.id).select('id').single();
      if (error) throw error; id = data.id; atualizados++;
    } else {
      const { data, error } = await db.from('grupos').insert(linha).select('id').single();
      if (error) throw error; id = data.id; criados++;
    }
    if (paiId) subgrupos++;

    const chaves = Array.isArray(g.obras) ? g.obras.map(text).filter(Boolean) : [];
    const idsResolvidos = [];
    chaves.forEach(k => { const oid = resolverObra(k); if (oid) idsResolvidos.push(oid); else naoEncontradas.push({ grupo: g.nome, opus: k }); });

    const { data: atuais } = await db.from('grupo_obras').select('obra_id').eq('grupo_id', id);
    const atuaisSet = new Set((atuais || []).map(x => x.obra_id));
    const novosSet = new Set(idsResolvidos);
    const paraAdicionar = idsResolvidos.filter(x => !atuaisSet.has(x));
    const paraRemover = [...atuaisSet].filter(x => !novosSet.has(x));
    if (paraAdicionar.length) {
      const { error } = await db.from('grupo_obras').upsert(paraAdicionar.map(obra_id => ({ grupo_id: id, obra_id })), { onConflict: 'grupo_id,obra_id', ignoreDuplicates: true });
      if (error) throw error;
    }
    if (paraRemover.length) {
      const { error } = await db.from('grupo_obras').delete().eq('grupo_id', id).in('obra_id', paraRemover);
      if (error) throw error;
    }
    vinculos += idsResolvidos.length;

    const sub = g.subgrupos;
    const listaSub = Array.isArray(sub) ? sub : (sub && typeof sub === 'object' ? Object.entries(sub).map(([nome, v]) => ({ nome, ...(v || {}) })) : []);
    for (const sg of listaSub) { if (text(sg.nome)) await upsertGrupo(sg, id); }
  }

  for (const g of lista) { if (text(g.nome)) await upsertGrupo(g, null); }
  return { criados, atualizados, subgrupos, vinculos, naoEncontradas };
}

export default async request => {
  try {
    const db = admin();
    if (request.method === 'GET') {
      const grupos = await montarGruposLista(db);
      return Response.json({ config: { permitirAuditorExcluir: false, permitirUsuarioCriarGrupo: true }, usuario: '', perfil: '', atualizadoEm: new Date().toISOString(), grupos });
    }
    if (request.method === 'POST') {
      const payload = await request.json();
      await sincronizarGrupos(db, payload);
      const grupos = await montarGruposLista(db);
      return Response.json({ ok: true, config: payload?.config || {}, usuario: payload?.usuario || '', perfil: payload?.perfil || '', atualizadoEm: new Date().toISOString(), grupos });
    }
    return new Response('Método não permitido', { status: 405 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
};
