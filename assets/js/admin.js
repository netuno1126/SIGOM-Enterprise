// ============================================================
// SIGOM v2 — Painel Administrativo (Fase 4)
// Depende de globais definidas em app.js: sb, PERFIL, CURRENT_USER_ID, $
// Ações sensíveis (criar usuário, redefinir senha) passam pela Netlify Function
// /api/admin-users, que usa a service role key no servidor — nunca no navegador.
// ============================================================
let USUARIOS = [];

async function carregarAdmin() {
  if (PERFIL !== "administrador") return;
  $("#listaUsuarios").innerHTML = `<div class="emptyMsg">Carregando usuários…</div>`;

  const { data, error } = await sb
    .from("profiles")
    .select("id, nome, email, perfil, ativo, criado_em")
    .order("nome", { ascending: true });

  if (error) {
    $("#listaUsuarios").innerHTML = `<div class="emptyMsg">Erro ao carregar usuários: ${error.message}</div>`;
    return;
  }
  USUARIOS = data || [];
  renderListaUsuarios();
}

function renderListaUsuarios() {
  const wrap = $("#listaUsuarios");
  if (!USUARIOS.length) {
    wrap.innerHTML = `<div class="emptyMsg">Nenhum usuário cadastrado.</div>`;
    return;
  }

  wrap.innerHTML = USUARIOS.map((u) => `
    <div class="userRow" data-id="${u.id}">
      <div class="who">
        <b>${u.nome || "—"}</b>
        <span>${u.email || ""}</span>
        ${!u.ativo ? `<span class="inativo">INATIVO</span>` : ""}
      </div>
      <select class="selPerfil" ${u.id === CURRENT_USER_ID ? "disabled title=\"Você não pode alterar seu próprio perfil\"" : ""}>
        <option value="consulta" ${u.perfil === "consulta" ? "selected" : ""}>Consulta</option>
        <option value="editor" ${u.perfil === "editor" ? "selected" : ""}>Editor</option>
        <option value="auditor" ${u.perfil === "auditor" ? "selected" : ""}>Auditor</option>
        <option value="administrador" ${u.perfil === "administrador" ? "selected" : ""}>Administrador</option>
      </select>
      <button class="btnToggleAtivo" ${u.id === CURRENT_USER_ID ? "disabled" : ""}>${u.ativo ? "Desativar" : "Reativar"}</button>
      <button class="btnResetSenha">Redefinir senha</button>
    </div>
  `).join("");

  wrap.querySelectorAll(".userRow").forEach((row) => {
    const id = row.dataset.id;
    row.querySelector(".selPerfil").addEventListener("change", (e) => atualizarPerfil(id, e.target.value));
    row.querySelector(".btnToggleAtivo").addEventListener("click", () => toggleAtivoUsuario(id));
    row.querySelector(".btnResetSenha").addEventListener("click", () => resetarSenhaUsuario(id));
  });
}

// ============================================================
// Alterações simples de perfil/status — via RLS direto (profiles_admin_update),
// não precisam passar pela Netlify Function.
// ============================================================
async function atualizarPerfil(id, novoPerfil) {
  const { error } = await sb.from("profiles").update({ perfil: novoPerfil }).eq("id", id);
  if (error) { alert("Erro ao atualizar perfil: " + error.message); return; }
  await carregarAdmin();
}

async function toggleAtivoUsuario(id) {
  const u = USUARIOS.find((x) => x.id === id);
  if (!u) return;
  const { error } = await sb.from("profiles").update({ ativo: !u.ativo }).eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  await carregarAdmin();
}

// ============================================================
// Ações que exigem privilégio de admin no Supabase Auth (service role):
// criação de usuário e redefinição de senha — via Netlify Function.
// ============================================================
async function chamarAdminAPI(payload) {
  const { data: { session } } = await sb.auth.getSession();
  const res = await fetch("/api/admin-users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

$("#formNovoUsuario").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = $("#adminNome").value.trim();
  const email = $("#adminEmail").value.trim();
  const senha = $("#adminSenha").value;
  const perfil = $("#adminPerfil").value;
  const msg = $("#adminMsg");
  msg.style.color = "var(--vermelho)";
  msg.textContent = "Criando usuário…";

  const resp = await chamarAdminAPI({ action: "create", nome, email, senha, perfil });

  if (!resp.ok) {
    msg.textContent = resp.msg || "Erro ao criar usuário.";
    return;
  }
  msg.style.color = "var(--verde)";
  msg.textContent = "Usuário criado ✓";
  $("#formNovoUsuario").reset();
  await carregarAdmin();
});

async function resetarSenhaUsuario(id) {
  const novaSenha = prompt("Digite a nova senha para este usuário (mínimo 6 caracteres):");
  if (!novaSenha) return;
  if (novaSenha.length < 6) { alert("A senha precisa ter pelo menos 6 caracteres."); return; }

  const resp = await chamarAdminAPI({ action: "reset-password", userId: id, novaSenha });
  if (!resp.ok) { alert(resp.msg || "Erro ao redefinir senha."); return; }
  alert("Senha redefinida com sucesso.");
}

window.carregarAdmin = carregarAdmin;
