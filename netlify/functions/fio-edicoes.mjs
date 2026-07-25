import { createClient } from '@supabase/supabase-js';

// Serve o fio_slide_SIGOM.html (slide visual da FIO) sem alterar nenhuma
// linha dele: reproduz o mesmo contrato de /api/fio-edicoes que o servidor
// local sempre respondeu, gravando/lendo na mesma tabela fio_edicoes que
// o Painel (SPA) do SIGOM v31 já usa — aqui o conteúdo fica dentro da
// chave "html" (o SPA usa campos próprios como status/summary/etc.), então
// as duas telas não se sobrescrevem, só compartilham a tabela e o
// histórico de versão.

const admin = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const text = v => String(v ?? '').normalize('NFC').trim();
const chave = (opus, contrato) => text(opus) + '|' + text(contrato);

export default async request => {
  try {
    const db = admin();

    if (request.method === 'GET') {
      const { data: obras, error: oe } = await db.from('obras').select('id,opus,contrato');
      if (oe) throw oe;
      const porObraId = new Map((obras || []).map(o => [o.id, o]));

      const { data: edicoes, error: ee } = await db.from('fio_edicoes').select('obra_id,conteudo,versao,editado_em').order('versao', { ascending: false });
      if (ee) throw ee;

      const data = {};
      for (const ed of edicoes || []) {
        if (data[ed.obra_id]) continue; // já pegamos a versão mais recente deste obra_id
        const conteudo = ed.conteudo || {};
        if (!conteudo.html) continue; // versão gravada pelo Painel (SPA), formato diferente — ignora aqui
        const obra = porObraId.get(ed.obra_id);
        if (!obra) continue;
        data[ed.obra_id] = null; // marca como já visto (independente de entrar no resultado)
        const k = chave(obra.opus, obra.contrato);
        data[k] = { opus: obra.opus || '', contrato: obra.contrato || '', atualizadoEm: ed.editado_em, html: conteudo.html };
      }
      // remove marcações internas (obra_id usados só para dedupe de versão)
      for (const k of Object.keys(data)) { if (data[k] === null) delete data[k]; }

      return Response.json({ data });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const entradas = body?.data && typeof body.data === 'object' ? body.data : {};

      const { data: obras, error: oe } = await db.from('obras').select('id,opus,contrato');
      if (oe) throw oe;
      const porOpusContrato = new Map((obras || []).map(o => [chave(o.opus, o.contrato), o.id]));
      const porOpus = new Map();
      (obras || []).forEach(o => { const k = text(o.opus); if (k && !porOpus.has(k)) porOpus.set(k, o.id); });

      let salvas = 0, ignoradas = 0; const naoEncontradas = [];
      for (const [k, entrada] of Object.entries(entradas)) {
        if (!entrada || typeof entrada.html !== 'string') continue;
        const opus = text(entrada.opus || k.split('|')[0]);
        const contrato = text(entrada.contrato || k.split('|')[1] || '');
        const obraId = porOpusContrato.get(chave(opus, contrato)) || porOpus.get(opus);
        if (!obraId) { naoEncontradas.push({ opus, contrato }); continue; }

        const { data: ultima } = await db.from('fio_edicoes').select('conteudo,versao').eq('obra_id', obraId).order('versao', { ascending: false }).limit(1).maybeSingle();
        if (ultima?.conteudo?.html === entrada.html) { ignoradas++; continue; }

        const { error } = await db.from('fio_edicoes').insert({
          obra_id: obraId,
          conteudo: { html: entrada.html, opus, contrato, atualizadoEm: new Date().toISOString() },
          versao: (ultima?.versao || 0) + 1,
        });
        if (error) throw error;
        salvas++;
      }
      return Response.json({ ok: true, salvas, ignoradas, naoEncontradas });
    }

    return new Response('Método não permitido', { status: 405 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
};
