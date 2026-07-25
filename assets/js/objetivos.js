// ============================================================
// SIGOM v2 — Objetivos / Auditoria (Fase 6)
// Depende de globais definidas em app.js: sb, PERFIL, CURRENT_USER_ID, $
//
// Escopo: esta tela cobre o registro de auditoria (situação manual + observação +
// marcação de "auditado") ligado à tabela `objetivos_auditoria`. O antigo
// objetivos.html do sistema offline também incluía um motor de análise automática
// (Objetivo 1 a 5, cruzamento com planilhas específicas, KPIs e gráficos por
// objetivo) que dependia de planilhas próprias fora do modelo de dados atual do
// Supabase — esse motor não foi portado; aqui ficou só a camada de auditoria manual,
// que é o que a tabela já criada suporta.
// ============================================================
let OBJETIVOS = [];

const SIT_LABELS = {
  ok: "Concluída/Recontratada", prazo: "Dentro do prazo/Localizada", adi: "Adiantada",
  aten: "Em atenção", atr: "Atrasada/Pendente", na: "Não localizada",
};

function podeAuditar() {
  return PERFIL === "administrador" || PERFIL === "editor" || PERFIL === "auditor";
}

async function carregarObjetivos() {
  if (!podeAuditar()) {
    const wrap = document.getElementById("formObjetivoWrap");
    if (wrap) wrap.style.display = "none";
  }

  $("#listaObjetivos").innerHTML = `<div class="emptyMsg">Carregando…</div>`;
  const { data, error } = await sb
    .from("objetivos_auditoria")
    .select("id, chave, objetivo, opus, contrato, situacao, observacao, auditado, atualizado_em")
    .order("atualizado_em", { ascending: false });

  if (error) {
    $("#listaObjetivos").innerHTML = `<div class="emptyMsg">Erro ao carregar: ${error.message}</div>`;
    return;
  }
  OBJETIVOS = data || [];
  renderObjetivos();
  $("#objBusca").oninput = renderObjetivos;
}

function renderObjetivos() {
  const busca = ($("#objBusca").value || "").trim().toLowerCase();
  const wrap = $("#listaObjetivos");
  const editavel = podeAuditar();

  const lista = !busca ? OBJETIVOS : OBJETIVOS.filter((o) =>
    [o.objetivo, o.opus, o.contrato].filter(Boolean).join(" ").toLowerCase().includes(busca)
  );

  if (!lista.length) {
    wrap.innerHTML = `<div class="emptyMsg">Nenhum registro de auditoria encontrado.</div>`;
    return;
  }

  wrap.innerHTML = lista.map((o) => `
    <div class="regRow" data-id="${o.id}">
      ${o.situacao ? `<span class="sitTag ${o.situacao}">${SIT_LABELS[o.situacao] || o.situacao}</span>` : ""}
      <span class="auditBadge ${o.auditado ? "ok" : ""}">${o.auditado ? "AUDITADO" : "pendente"}</span>
      <div class="info">
        <b>${o.objetivo}</b> ${o.opus ? "· OPUS " + o.opus : ""} ${o.contrato ? "· " + o.contrato : ""}
        ${o.observacao ? `<div class="obsTxt">${o.observacao}</div>` : ""}
      </div>
      ${editavel ? `<button class="btnToggleAuditado" data-id="${o.id}">${o.auditado ? "Desmarcar" : "Marcar auditado"}</button>
      <button class="btnExcluirObjetivo" data-id="${o.id}">Excluir</button>` : ""}
    </div>
  `).join("");

  if (editavel) {
    wrap.querySelectorAll(".btnToggleAuditado").forEach((btn) => {
      btn.addEventListener("click", () => toggleAuditado(btn.dataset.id));
    });
    wrap.querySelectorAll(".btnExcluirObjetivo").forEach((btn) => {
      btn.addEventListener("click", () => excluirObjetivo(btn.dataset.id));
    });
  }
}

document.getElementById("formObjetivo")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const objetivo = $("#objObjetivo").value.trim();
  const opus = $("#objOpus").value.trim();
  const contrato = $("#objContrato").value.trim();
  const situacao = $("#objSituacao").value;
  const observacao = $("#objObs").value.trim();
  const auditado = $("#objAuditado").checked;
  if (!objetivo) return;

  const chaveBase = (opus || contrato || objetivo).replace(/[^A-Za-z0-9]+/g, "_");
  const chave = `${objetivo.replace(/[^A-Za-z0-9]+/g, "").slice(0, 20)}_${chaveBase}`.toUpperCase();

  const { error } = await sb.from("objetivos_auditoria").upsert({
    chave, objetivo, opus, contrato, situacao: situacao || null, observacao, auditado,
    atualizado_por: CURRENT_USER_ID,
  }, { onConflict: "chave" });

  if (error) { alert("Erro ao salvar: " + error.message); return; }
  e.target.reset();
  await carregarObjetivos();
});

async function toggleAuditado(id) {
  const item = OBJETIVOS.find((o) => o.id === id);
  if (!item) return;
  const { error } = await sb.from("objetivos_auditoria").update({
    auditado: !item.auditado, atualizado_por: CURRENT_USER_ID,
  }).eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  await carregarObjetivos();
}

async function excluirObjetivo(id) {
  if (!confirm("Excluir este registro de auditoria?")) return;
  const { error } = await sb.from("objetivos_auditoria").delete().eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  await carregarObjetivos();
}

window.carregarObjetivos = carregarObjetivos;
