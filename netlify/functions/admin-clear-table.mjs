import { createClient } from '@supabase/supabase-js';

// Permite que um administrador apague todos os registros de uma tabela
// específica do SIGOM (não apaga a tabela em si, só os dados — a
// estrutura/colunas continuam existindo). Lista fechada por segurança:
// nunca aceita nome de tabela vindo livre do cliente.
const TABELAS_PERMITIDAS = {
  obras: 'obras',
  grupos: 'grupos',
  grupo_obras: 'grupo_obras',
  fio_edicoes: 'fio_edicoes',
  portfolio_obras: 'portfolio_obras',
  saldos_alongados: 'saldos_alongados',
  nomes_obras: 'nomes_obras',
  obras_paralisadas: 'obras_paralisadas',
  objetivos_auditoria: 'objetivos_auditoria',
  importacoes_planilha: 'importacoes_planilha',
};

async function adminClient(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) throw Object.assign(new Error('Não autenticado'), { status: 401 });
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) throw Object.assign(new Error('Sessão inválida'), { status: 401 });
  const { data: p } = await admin.from('profiles').select('perfil').eq('id', user.id).single();
  if (p?.perfil !== 'administrador') throw Object.assign(new Error('Acesso restrito ao administrador'), { status: 403 });
  return { admin, user };
}

export default async request => {
  try {
    if (request.method !== 'POST') return new Response('Método não permitido', { status: 405 });
    const { admin, user } = await adminClient(request);
    const body = await request.json();
    const tabela = TABELAS_PERMITIDAS[body?.table];
    if (!tabela) throw new Error('Tabela não permitida ou não informada.');

    const { count: antes } = await admin.from(tabela).select('*', { count: 'exact', head: true });

    // Supabase exige um filtro no delete; "id is not null" cobre 100% das linhas
    // em todas as tabelas do schema (todas usam id uuid como chave primária).
    const { error } = await admin.from(tabela).delete().not('id', 'is', null);
    if (error) throw error;

    await admin.from('auditoria_logs').insert({
      usuario_id: user.id, acao: 'LIMPAR_TABELA', entidade: tabela,
      antes: { registros: antes ?? null }, depois: { registros: 0 },
    });

    return Response.json({ ok: true, table: tabela, removidos: antes ?? null });
  } catch (e) {
    return Response.json({ error: e.message }, { status: e.status || 400 });
  }
};
