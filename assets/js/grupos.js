// ============================================================
// SIGOM v2 — módulo de Grupos de Obras (Fase 2)
// Depende de variáveis/funções globais definidas em app.js: sb, OBRAS, PERFIL, $, fmtMoeda
// ============================================================
let GRUPOS = [];          // cache local dos grupos (com contagem de obras)
let GRUPO_SELECIONADO = null;
let OBRAS_DO_GRUPO = [];  // obras (join) do grupo atualmente selecionado
let SELECAO_MODAL = new Set(); // ids de obra marcados no modal de adicionar

function podeEditarGrupos() {
  return PERFIL === "administrador" || PERFIL === "editor";
}

// ============================================================
// CARREGAR LISTA DE GRUPOS
// ============================================================
async function carregarGrupos() {
  const { data, error } = await sb
    .from("grupos")
    .select("id, nome, descricao, arquivado, criado_em, grupo_obras(count)")
    .order("nome", { ascending: true });

  if (error) {
    $("#listaGrupos").innerHTML = `<li class="emptyMsg">Erro ao carregar grupos: ${error.message}</li>`;
    return;
  }

  GRUPOS = (data || []).map((g) => ({
    ...g,
    qtdObras: g.grupo_obras?.[0]?.count || 0,
  }));

  if (!podeEditarGrupos()) {
    const wrap = document.getElementById("novoGrupoWrap");
    if (wrap) wrap.style.display = "none";
  }

  renderListaGrupos();
}

function renderListaGrupos() {
  const ul = $("#listaGrupos");
  if (!GRUPOS.length) {
    ul.innerHTML = `<li class="emptyMsg">Nenhum grupo cadastrado ainda.</li>`;
    return;
  }
  ul.innerHTML = GRUPOS.map((g) => `
    <li class="${GRUPO_SELECIONADO === g.id ? "active" : ""}" data-id="${g.id}">
      <span>${g.nome}${g.arquivado ? " (arquivado)" : ""}</span>
      <span class="qt">${g.qtdObras}</span>
    </li>
  `).join("");

  ul.querySelectorAll("li[data-id]").forEach((li) => {
    li.addEventListener("click", () => selecionarGrupo(li.dataset.id));
  });
}

// ============================================================
// CRIAR GRUPO
// ============================================================
$("#formNovoGrupo").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = $("#novoGrupoNome").value.trim();
  const descricao = $("#novoGrupoDesc").value.trim();
  if (!nome) return;

  const { data, error } = await sb.from("grupos").insert({ nome, descricao }).select().single();
  if (error) {
    alert("Não foi possível criar o grupo: " + error.message);
    return;
  }
  $("#novoGrupoNome").value = "";
  $("#novoGrupoDesc").value = "";
  await carregarGrupos();
  selecionarGrupo(data.id);
});

// ============================================================
// SELECIONAR / DETALHAR GRUPO
// ============================================================
async function selecionarGrupo(id) {
  GRUPO_SELECIONADO = id;
  renderListaGrupos();

  const grupo = GRUPOS.find((g) => g.id === id);
  const detalhe = $("#detalheGrupo");
  detalhe.innerHTML = `<div class="emptyMsg">Carregando obras do grupo…</div>`;

  const { data, error } = await sb
    .from("grupo_obras")
    .select("obra_id, obras(id, opus, contrato, rm, om_beneficiada, empresa, valor_atual)")
    .eq("grupo_id", id);

  if (error) {
    detalhe.innerHTML = `<div class="emptyMsg">Erro ao carregar obras do grupo: ${error.message}</div>`;
    return;
  }

  OBRAS_DO_GRUPO = (data || []).map((r) => r.obras).filter(Boolean);
  renderDetalheGrupo(grupo);
}

function renderDetalheGrupo(grupo) {
  const detalhe = $("#detalheGrupo");
  const editavel = podeEditarGrupos();

  const acoes = editavel ? `
    <div class="grupoAcoes">
      <button class="btnAdd" id="btnAbrirModalAdd">+ Adicionar obras</button>
      <button class="btnArquivar" id="btnArquivarGrupo">${grupo.arquivado ? "Reativar" : "Arquivar"}</button>
      <button class="btnExcluir" id="btnExcluirGrupo">Excluir grupo</button>
    </div>` : "";

  const acoesExport = `
    <div class="grupoAcoes">
      <button class="btnAdd" id="btnPptxGrupo" style="background:#5a3d99">Gerar PPTX (FIO do grupo)</button>
      <span id="grupoFioStatus" style="font-size:12px;color:#5a6b7a;align-self:center"></span>
    </div>`;

  detalhe.innerHTML = `
    <div class="grupoHeader">
      <div>
        <h3>${grupo.nome}</h3>
        <div class="desc">${grupo.descricao || "Sem descrição"} · ${OBRAS_DO_GRUPO.length} obra(s)</div>
      </div>
      ${acoes}
    </div>
    ${acoesExport}
    <div id="obrasDoGrupoWrap">
      ${OBRAS_DO_GRUPO.length ? OBRAS_DO_GRUPO.map((o) => `
        <div class="obraItem">
          <div class="info"><b>${o.opus || "—"}</b> | ${o.contrato || "—"} — ${o.om_beneficiada || o.rm || ""} ${o.empresa ? "· " + o.empresa : ""} ${o.valor_atual ? "· " + fmtMoeda(o.valor_atual) : ""}</div>
          ${editavel ? `<button class="btnRemover" data-obra="${o.id}">Remover</button>` : ""}
        </div>
      `).join("") : `<div class="emptyMsg">Nenhuma obra neste grupo ainda.</div>`}
    </div>
  `;

  if (editavel) {
    $("#btnAbrirModalAdd")?.addEventListener("click", abrirModalAdd);
    $("#btnArquivarGrupo")?.addEventListener("click", () => toggleArquivarGrupo(grupo));
    $("#btnExcluirGrupo")?.addEventListener("click", () => excluirGrupo(grupo));
    detalhe.querySelectorAll(".btnRemover").forEach((btn) => {
      btn.addEventListener("click", () => removerObraDoGrupo(btn.dataset.obra));
    });
  }
  $("#btnPptxGrupo")?.addEventListener("click", () =>
    gerarFioPptx(OBRAS_DO_GRUPO.map((o) => o.id), $("#grupoFioStatus"))
  );
}

async function toggleArquivarGrupo(grupo) {
  const novoValor = !grupo.arquivado;
  const { error } = await sb.from("grupos").update({
    arquivado: novoValor,
    arquivado_em: novoValor ? new Date().toISOString() : null,
  }).eq("id", grupo.id);
  if (error) { alert("Erro: " + error.message); return; }
  await carregarGrupos();
  selecionarGrupo(grupo.id);
}

async function excluirGrupo(grupo) {
  if (!confirm(`Excluir o grupo "${grupo.nome}" e todas as suas associações de obras? Essa ação não pode ser desfeita.`)) return;
  const { error } = await sb.from("grupos").delete().eq("id", grupo.id);
  if (error) { alert("Erro: " + error.message); return; }
  GRUPO_SELECIONADO = null;
  $("#detalheGrupo").innerHTML = `<div class="emptyMsg">Selecione um grupo à esquerda para ver as obras.</div>`;
  await carregarGrupos();
}

async function removerObraDoGrupo(obraId) {
  const { error } = await sb.from("grupo_obras").delete().eq("grupo_id", GRUPO_SELECIONADO).eq("obra_id", obraId);
  if (error) { alert("Erro ao remover: " + error.message); return; }
  const grupo = GRUPOS.find((g) => g.id === GRUPO_SELECIONADO);
  await selecionarGrupo(GRUPO_SELECIONADO);
  await carregarGrupos(); // atualiza contagem na lista
  renderListaGrupos();
}

// ============================================================
// MODAL — ADICIONAR OBRAS AO GRUPO
// ============================================================
function abrirModalAdd() {
  SELECAO_MODAL = new Set();
  $("#modalBusca").value = "";
  $("#selecionarTudoBusca").checked = false;
  $("#modalAddObras").classList.remove("hidden");
  renderModalLista();
}

function fecharModalAdd() {
  $("#modalAddObras").classList.add("hidden");
}
$("#fecharModal").addEventListener("click", fecharModalAdd);
$("#modalCancelar").addEventListener("click", fecharModalAdd);

function idsJaNoGrupo() {
  return new Set(OBRAS_DO_GRUPO.map((o) => o.id));
}

function obrasFiltradasModal() {
  const busca = $("#modalBusca").value.trim().toLowerCase();
  if (!busca) return OBRAS;
  return OBRAS.filter((o) => {
    const alvo = [o.opus, o.contrato, o.empresa, o.om_beneficiada, o.contratante].filter(Boolean).join(" ").toLowerCase();
    return alvo.includes(busca);
  });
}

function renderModalLista() {
  const jaNoGrupo = idsJaNoGrupo();
  const lista = obrasFiltradasModal();
  const wrap = $("#modalListaObras");

  if (!lista.length) {
    wrap.innerHTML = `<div class="emptyMsg">Nenhuma obra encontrada.</div>`;
    return;
  }

  wrap.innerHTML = lista.map((o) => {
    const jaTem = jaNoGrupo.has(o.id);
    const marcado = SELECAO_MODAL.has(o.id);
    return `
      <div class="obraItem ${jaTem ? "disabled" : ""}">
        <input type="checkbox" data-obra="${o.id}" ${jaTem ? "disabled" : ""} ${marcado ? "checked" : ""}>
        <div class="info"><b>${o.opus || "—"}</b> | ${o.contrato || "—"} — ${o.om_beneficiada || o.rm || ""}${jaTem ? " (já está no grupo)" : ""}</div>
      </div>
    `;
  }).join("");

  wrap.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) SELECAO_MODAL.add(cb.dataset.obra);
      else SELECAO_MODAL.delete(cb.dataset.obra);
    });
  });
}

$("#modalBusca").addEventListener("input", () => {
  $("#selecionarTudoBusca").checked = false;
  renderModalLista();
});

$("#selecionarTudoBusca").addEventListener("change", (e) => {
  const jaNoGrupo = idsJaNoGrupo();
  const lista = obrasFiltradasModal().filter((o) => !jaNoGrupo.has(o.id));
  if (e.target.checked) lista.forEach((o) => SELECAO_MODAL.add(o.id));
  else lista.forEach((o) => SELECAO_MODAL.delete(o.id));
  renderModalLista();
});

$("#modalConfirmar").addEventListener("click", async () => {
  if (!SELECAO_MODAL.size) { fecharModalAdd(); return; }
  const linhas = [...SELECAO_MODAL].map((obraId) => ({ grupo_id: GRUPO_SELECIONADO, obra_id: obraId }));
  const { error } = await sb.from("grupo_obras").insert(linhas);
  if (error) {
    alert("Erro ao adicionar obras: " + error.message);
    return;
  }
  fecharModalAdd();
  const gId = GRUPO_SELECIONADO;
  await carregarGrupos();
  await selecionarGrupo(gId);
});

window.carregarGrupos = carregarGrupos;
