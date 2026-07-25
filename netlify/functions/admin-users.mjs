// netlify/functions/admin-users.mjs
//
// Endpoint server-side (usa a SERVICE ROLE KEY do Supabase — NUNCA embutida no front-end).
// Ações restritas a usuários com perfil "administrador".
//
// Variáveis de ambiente necessárias (configurar em Netlify > Site settings > Environment variables):
//   SUPABASE_URL              -> https://vstqinwjlhrrouxvwzpx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY -> chave "service_role" (Supabase Dashboard > Project Settings > API)
//
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function getCallerProfile(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, perfil, ativo")
    .eq("id", userData.user.id)
    .single();

  if (!profile || !profile.ativo) return null;
  return profile;
}

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, msg: "Método não permitido" }, 405);

  const caller = await getCallerProfile(req);
  if (!caller || caller.perfil !== "administrador") {
    return json({ ok: false, msg: "Acesso restrito a administradores" }, 403);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, msg: "Corpo da requisição inválido" }, 400);
  }

  const { action } = body;

  // ---------------------------------------------------------
  // Criar novo usuário
  // ---------------------------------------------------------
  if (action === "create") {
    const { email, senha, nome, perfil } = body;
    if (!email || !senha || senha.length < 6) {
      return json({ ok: false, msg: "E-mail e senha (mínimo 6 caracteres) são obrigatórios" }, 400);
    }
    const perfisValidos = ["administrador", "auditor", "editor", "consulta"];
    const perfilFinal = perfisValidos.includes(perfil) ? perfil : "consulta";

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: nome || email.split("@")[0] },
    });
    if (error) return json({ ok: false, msg: error.message }, 400);

    // O trigger on_auth_user_created já cria a linha em profiles com perfil 'consulta'.
    // Atualiza para o perfil escolhido no formulário.
    const { error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({ perfil: perfilFinal, nome: nome || email.split("@")[0] })
      .eq("id", data.user.id);
    if (updErr) return json({ ok: false, msg: "Usuário criado, mas falhou ao definir perfil: " + updErr.message }, 500);

    return json({ ok: true, id: data.user.id });
  }

  // ---------------------------------------------------------
  // Redefinir senha de um usuário existente
  // ---------------------------------------------------------
  if (action === "reset-password") {
    const { userId, novaSenha } = body;
    if (!userId || !novaSenha || novaSenha.length < 6) {
      return json({ ok: false, msg: "userId e novaSenha (mínimo 6 caracteres) são obrigatórios" }, 400);
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: novaSenha });
    if (error) return json({ ok: false, msg: error.message }, 400);
    return json({ ok: true });
  }

  return json({ ok: false, msg: "Ação desconhecida" }, 400);
};
