// ============================================================
// SIGOM v2 — cliente Supabase (auth + dados de obras em tempo real)
// ============================================================
const SUPABASE_URL = "https://vstqinwjlhrrouxvwzpx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzdHFpbndqbGhycm91eHZ3enB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MTAzMTAsImV4cCI6MjEwMDQ4NjMxMH0.ahKstSpgeb2mOeo8XMj3RGw-zZReKmg3-Ahs1aTWe_s";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let OBRAS = [];       // cache local de todas as obras já carregadas
let PERFIL = null;    // perfil do usuário logado (administrador | auditor | editor | consulta)
let CURRENT_USER_ID = null;

const $ = (sel) => document.querySelector(sel);

// ---------- Helpers de formatação ----------
function fmtMoeda(v) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtPct(v) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
}
// Classificação IDP (medido ÷ estimado) — mesma régua usada no restante do SIGOM
function classificarIDP(idp) {
  if (idp === null || idp === undefined || isNaN(idp)) return { label: "Sem projeção", cls: "b-cinza", key: "" };
  if (idp >= 1) return { label: "Adiantada", cls: "b-verde", key: "adiantada" };
  if (idp >= 0.9) return { label: "Dentro do Planejado", cls: "b-azul", key: "planejado" };
  if (idp >= 0.7) return { label: "Atenção", cls: "b-laranja", key: "atencao" };
  return { label: "Atraso Crítico", cls: "b-vermelho", key: "critico" };
}

// ============================================================
// AUTENTICAÇÃO
// ============================================================
async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    await onLoggedIn(session);
  } else {
    showLogin();
  }

  sb.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") showLogin();
  });
}

function showLogin() {
  $("#loginScreen").classList.remove("hidden");
  $("#appScreen").classList.add("hidden");
}

async function onLoggedIn(session) {
  $("#loginScreen").classList.add("hidden");
  $("#appScreen").classList.remove("hidden");
  CURRENT_USER_ID = session.user.id;

  // Busca o perfil do usuário (nome + perfil de acesso)
  const { data: perfilRow, error } = await sb
    .from("profiles")
    .select("nome, perfil")
    .eq("id", session.user.id)
    .single();

  if (error || !perfilRow) {
    $("#userNome").textContent = session.user.email;
  } else {
    PERFIL = perfilRow.perfil;
    $("#userNome").textContent = `${perfilRow.nome || session.user.email} · ${perfilRow.perfil}`;
    if (PERFIL === "administrador") $("#tabBtnAdmin").classList.remove("hidden");
  }

  await carregarObras();
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#loginEmail").value.trim();
  const senha = $("#loginSenha").value;
  const btn = $("#loginBtn");
  const msg = $("#loginMsg");
  msg.textContent = "";
  btn.disabled = true;
  btn.textContent = "Entrando...";

  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });

  btn.disabled = false;
  btn.textContent = "Entrar";

  if (error) {
    msg.textContent = "Login ou senha inválidos.";
    return;
  }
  await onLoggedIn(data.session);
});

$("#btnLogout").addEventListener("click", async () => {
  await sb.auth.signOut();
  OBRAS = [];
});

// ============================================================
// CARREGAMENTO DE OBRAS (Supabase -> mesmo shape usado no SIGOM offline)
// ============================================================
async function carregarObras() {
  $("#tbodyObras").innerHTML = `<tr><td colspan="9" id="loadingRow">Carregando obras…</td></tr>`;

  const { data, error } = await sb
    .from("obras")
    .select("id, opus, contrato, rm, contratante, om_beneficiada, descricao, nome_obra, empresa, valor_atual, percentual_medido, percentual_estimado, dados")
    .order("rm", { ascending: true });

  if (error) {
    $("#tbodyObras").innerHTML = `<tr><td colspan="9" id="loadingRow">Erro ao carregar obras: ${error.message}</td></tr>`;
    return;
  }

  // Reconstrói o objeto "obra" mesclando as colunas indexadas com o jsonb "dados"
  // (que guarda todos os campos originais da planilha, ex: "Nr Solicitação", "% medido", "IDP")
  OBRAS = (data || []).map((row) => ({
    ...row.dados,
    id: row.id,
    opus: row.opus,
    contrato: row.contrato,
    rm: row.rm,
    contratante: row.contratante,
    om_beneficiada: row.om_beneficiada,
    empresa: row.empresa,
    valor_atual: row.valor_atual,
    percentual_medido: row.percentual_medido,
    percentual_estimado: row.percentual_estimado,
  }));

  popularFiltroRM();
  renderResumo();
  renderTabela();
}

function popularFiltroRM() {
  const sel = $("#filtroRM");
  const atual = sel.value;
  const rms = [...new Set(OBRAS.map((o) => o.rm).filter(Boolean))].sort();
  sel.innerHTML = `<option value="">Todas as RM</option>` + rms.map((r) => `<option value="${r}">${r}</option>`).join("");
  sel.value = atual;
}

function obrasFiltradas() {
  const rm = $("#filtroRM").value;
  const idpFiltro = $("#filtroIDP").value;
  const busca = $("#busca").value.trim().toLowerCase();

  return OBRAS.filter((o) => {
    if (rm && o.rm !== rm) return false;
    if (idpFiltro) {
      const idp = o.IDP ?? null;
      if (classificarIDP(idp).key !== idpFiltro) return false;
    }
    if (busca) {
      const alvo = [o.opus, o.contrato, o.empresa, o.om_beneficiada, o.contratante, o.nome_obra]
        .filter(Boolean).join(" ").toLowerCase();
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });
}

function renderResumo() {
  const lista = obrasFiltradas();
  const total = lista.length;
  const valorTotal = lista.reduce((s, o) => s + (Number(o.valor_atual) || 0), 0);
  const criticas = lista.filter((o) => classificarIDP(o.IDP).key === "critico").length;
  const medioMedido =
    lista.length ? lista.reduce((s, o) => s + (Number(o.percentual_medido) || 0), 0) / lista.length : 0;

  $("#cardsSummary").innerHTML = `
    <div class="card">
      <div class="lbl">Obras no portfólio</div>
      <div class="val">${total}</div>
    </div>
    <div class="card verde">
      <div class="lbl">Valor total (atual)</div>
      <div class="val">${fmtMoeda(valorTotal)}</div>
    </div>
    <div class="card laranja">
      <div class="lbl">% medido médio</div>
      <div class="val">${fmtPct(medioMedido)}</div>
    </div>
    <div class="card vermelho">
      <div class="lbl">Em atraso crítico</div>
      <div class="val">${criticas}</div>
    </div>
  `;
}

function renderTabela() {
  const lista = obrasFiltradas();
  $("#contagem").textContent = `${lista.length} obra(s)`;

  if (!lista.length) {
    $("#tbodyObras").innerHTML = `<tr><td colspan="9" id="loadingRow">Nenhuma obra encontrada com os filtros atuais.</td></tr>`;
    return;
  }

  $("#tbodyObras").innerHTML = lista
    .map((o) => {
      const st = classificarIDP(o.IDP);
      return `<tr>
        <td>${o.opus || "—"}</td>
        <td>${o.contrato || "—"}</td>
        <td>${o.rm || "—"}</td>
        <td>${o.om_beneficiada || "—"}</td>
        <td>${o.empresa || "—"}</td>
        <td>${fmtMoeda(o.valor_atual)}</td>
        <td>${fmtPct(o.percentual_medido)}</td>
        <td>${o.IDP != null ? Number(o.IDP).toFixed(2) : "—"}</td>
        <td><span class="badge ${st.cls}">${st.label}</span></td>
      </tr>`;
    })
    .join("");
}

["filtroRM", "filtroIDP"].forEach((id) => $(`#${id}`).addEventListener("change", () => { renderResumo(); renderTabela(); }));
$("#busca").addEventListener("input", () => { renderResumo(); renderTabela(); });

// ============================================================
// TABS (Obras / Grupos)
// ============================================================
document.querySelectorAll(".tabBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tabBtn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tabPane").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
    if (btn.dataset.tab === "tabGrupos" && window.carregarGrupos) window.carregarGrupos();
    if (btn.dataset.tab === "tabFio" && window.carregarFio) window.carregarFio();
    if (btn.dataset.tab === "tabAdmin" && window.carregarAdmin) window.carregarAdmin();
    if (btn.dataset.tab === "tabParalisadas" && window.carregarParalisadas) window.carregarParalisadas();
    if (btn.dataset.tab === "tabObjetivos" && window.carregarObjetivos) window.carregarObjetivos();
  });
});

// ============================================================
initAuth();
