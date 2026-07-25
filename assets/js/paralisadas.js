// ============================================================
// SIGOM v2 — Obras Paralisadas (Fase 6)
// Depende de globais definidas em app.js: sb, PERFIL, CURRENT_USER_ID, $
// ============================================================
let PARALISADAS = [];

function podeEditarParalisadas() {
  return PERFIL === "administrador" || PERFIL === "editor";
}

async function carregarParalisadas() {
  if (!podeEditarParalisadas()) {
    const wrap = document.getElementById("formParalisadaWrap");
    if (wrap) wrap.style.display = "none";
  }

  $("#listaParalisadas").innerHTML = `<div class="emptyMsg">Carregando…</div>`;
  const { data, error } = await sb
    .from("obras_paralisadas")
    .select("id, processo_critico, opus, contrato, titulo, dados, ativo, atualizado_em")
    .eq("ativo", true)
    .order("processo_critico", { ascending: true });

  if (error) {
    $("#listaParalisadas").innerHTML = `<div class="emptyMsg">Erro ao carregar: ${error.message}</div>`;
    return;
  }
  PARALISADAS = data || [];
  renderParalisadas();
}

function renderParalisadas() {
  const wrap = $("#listaParalisadas");
  if (!PARALISADAS.length) {
    wrap.innerHTML = `<div class="emptyMsg">Nenhuma obra paralisada cadastrada.</div>`;
    return;
  }
  const editavel = podeEditarParalisadas();

  wrap.innerHTML = PARALISADAS.map((p) => `
    <div class="regRow" data-id="${p.id}">
      <span class="procTag p${p.processo_critico}">Processo crítico ${p.processo_critico}</span>
      <div class="info">
        <b>${p.opus || "—"}</b> ${p.contrato ? "| " + p.contrato : ""} — ${p.titulo}
        ${p.dados?.obs ? `<div class="obsTxt">${p.dados.obs}</div>` : ""}
      </div>
      ${editavel ? `<button class="btnExcluirParalisada" data-id="${p.id}">Excluir</button>` : ""}
    </div>
  `).join("");

  if (editavel) {
    wrap.querySelectorAll(".btnExcluirParalisada").forEach((btn) => {
      btn.addEventListener("click", () => excluirParalisada(btn.dataset.id));
    });
  }
}

document.getElementById("formParalisada")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const opus = $("#parOpus").value.trim();
  const contrato = $("#parContrato").value.trim();
  const titulo = $("#parTitulo").value.trim();
  const processo_critico = Number($("#parProcesso").value);
  const obs = $("#parObs").value.trim();
  if (!titulo) return;

  const { error } = await sb.from("obras_paralisadas").insert({
    opus, contrato, titulo, processo_critico,
    dados: { obs },
    atualizado_por: CURRENT_USER_ID,
  });
  if (error) { alert("Erro ao cadastrar: " + error.message); return; }

  e.target.reset();
  await carregarParalisadas();
});

async function excluirParalisada(id) {
  if (!confirm("Remover esta obra da lista de paralisadas?")) return;
  const { error } = await sb.from("obras_paralisadas").update({ ativo: false, atualizado_por: CURRENT_USER_ID }).eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  await carregarParalisadas();
}

window.carregarParalisadas = carregarParalisadas;
