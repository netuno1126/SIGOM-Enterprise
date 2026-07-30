(() => {
  const cfg = window.SIGOM_CONFIG || window.parent?.SIGOM_CONFIG;
  const sb = window.supabase?.createClient && cfg
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey)
    : null;

  function chaveFio(r) {
    return String(r?.['Solicitação'] || '') + '|' + String(r?.['Contrato'] || '');
  }

  async function instalarCorrecao() {
    if (!sb) {
      console.warn('Correção de versionamento FIO: Supabase não configurado.');
      return;
    }

    const { data: { session } } = await sb.auth.getSession();
    if (!session) return;

    window.salvarEdicaoFIO = async function salvarEdicaoFIOVersionada() {
      const r = window.OBRAS?.[window.fioIndexAtual];
      if (!r) return;

      if (!r.obra_id) {
        alert(
          'Esta linha existe somente no Portfólio e ainda não está vinculada à tabela de Obras. ' +
          'Importe também a Planilha de Obras para salvar versões.'
        );
        return;
      }

      const slide = document.getElementById('fioSlide');
      if (!slide) {
        alert('Não foi possível localizar o conteúdo da FIO.');
        return;
      }

      const clone = slide.cloneNode(true);
      clone.querySelectorAll('input').forEach((x) => x.remove());
      const html = clone.innerHTML;

      const { data: ultima, error: erroConsulta } = await sb
        .from('fio_edicoes')
        .select('versao')
        .eq('obra_id', r.obra_id)
        .order('versao', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (erroConsulta) {
        alert('Erro ao consultar a última versão da FIO: ' + erroConsulta.message);
        return;
      }

      let versao = (Number(ultima?.versao) || 0) + 1;
      let salvo = null;
      let erroFinal = null;

      for (let tentativa = 0; tentativa < 3; tentativa += 1) {
        const payload = {
          obra_id: r.obra_id,
          versao,
          criado_por: session.user.id,
          data_referencia: new Date().toISOString().slice(0, 10),
          responsavel: session.user.email,
          percentual_fisico:
            typeof window.toNum === 'function' ? window.toNum(r['% medido']) : null,
          observacoes: r['obs'] || '',
          html_snapshot: html,
          origem_dados: {
            nr_solicitacao: r['Solicitação'],
            nr_contrato: r['Contrato'],
            fontes: ['obras', 'portfolio_obras'],
            idp: typeof window.calcIDP === 'function' ? window.calcIDP(r) : null,
            formula_idp: 'percentual_medido / percentual_estimado'
          }
        };

        const { data, error } = await sb
          .from('fio_edicoes')
          .insert(payload)
          .select('*')
          .single();

        if (!error) {
          salvo = data || payload;
          erroFinal = null;
          break;
        }

        erroFinal = error;

        if (error.code === '23505') {
          versao += 1;
          continue;
        }

        break;
      }

      if (erroFinal) {
        alert('Erro ao salvar FIO: ' + erroFinal.message);
        return;
      }

      if (Array.isArray(window.latest)) window.latest.push(salvo);

      if (window.FIO_EDICOES && typeof window.FIO_EDICOES === 'object') {
        window.FIO_EDICOES[chaveFio(r)] = { html, versao };
      }

      alert('FIO salva como versão ' + versao + '.');
    };

    console.info('SIGOM Fase 12.32: salvamento versionado da FIO ativado.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => instalarCorrecao().catch(console.error), 600);
    });
  } else {
    setTimeout(() => instalarCorrecao().catch(console.error), 600);
  }
})();
