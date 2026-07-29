import { createClient } from '@supabase/supabase-js'

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }
})

const cleanUsername = (value) => String(value || '').trim().toLowerCase()
const validUsername = (value) => /^[a-z0-9._-]{3,40}$/.test(value)

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY

  if (!url || !service || !publishable) {
    return json({
      error: 'Serviço administrativo não configurado no Netlify.',
      missing: [
        !url && 'SUPABASE_URL',
        !service && 'SUPABASE_SERVICE_ROLE_KEY',
        !publishable && 'SUPABASE_PUBLISHABLE_KEY'
      ].filter(Boolean)
    }, 500)
  }

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Sessão ausente. Entre novamente no SIGOM.' }, 401)

  try {
    const authClient = createClient(url, publishable, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data: userData, error: userError } = await authClient.auth.getUser(token)
    const user = userData?.user
    if (userError || !user) return json({ error: 'Sessão inválida ou expirada.' }, 401)

    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('perfil,ativo')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile || profile.ativo === false || profile.perfil !== 'administrador') {
      return json({ error: 'Acesso exclusivo do administrador.' }, 403)
    }

    let body
    try {
      body = await req.json()
    } catch {
      return json({ error: 'JSON inválido.' }, 400)
    }

    if (body.action === 'list') {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (error) throw error

      const users = data?.users || []
      const ids = users.map((u) => u.id)
      let profiles = []

      if (ids.length) {
        const result = await admin
          .from('profiles')
          .select('id,nome,username,perfil,ativo')
          .in('id', ids)
        if (result.error) throw result.error
        profiles = result.data || []
      }

      const map = new Map(profiles.map((p) => [p.id, p]))
      return json({
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          last_sign_in_at: u.last_sign_in_at,
          ...(map.get(u.id) || { perfil: 'consulta', ativo: true })
        }))
      })
    }

    if (body.action === 'create') {
      const nome = String(body.nome || '').trim()
      const email = String(body.email || '').trim().toLowerCase()
      const username = cleanUsername(body.username)
      const password = String(body.password || '')

      if (!nome || !email || !password || !username) {
        return json({ error: 'Nome completo, nome de usuário, e-mail e senha são obrigatórios.' }, 400)
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'E-mail inválido.' }, 400)
      if (!validUsername(username)) {
        return json({ error: 'Nome de usuário inválido. Use 3 a 40 caracteres: letras, números, ponto, hífen ou sublinhado.' }, 400)
      }

      const { data: existing, error: existingError } = await admin
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle()
      if (existingError) throw existingError
      if (existing) return json({ error: `O nome de usuário “${username}” já está em uso.` }, 409)

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome, username }
      })
      if (error) throw error

      const { error: profileInsertError } = await admin.from('profiles').upsert({
        id: data.user.id,
        nome,
        username,
        perfil: body.perfil || 'consulta',
        ativo: true
      })

      if (profileInsertError) {
        try { await admin.auth.admin.deleteUser(data.user.id) } catch {}
        throw profileInsertError
      }

      return json({ ok: true, userId: data.user.id, username })
    }

    if (body.action === 'update') {
      if (!body.userId) return json({ error: 'userId obrigatório.' }, 400)

      const patch = { atualizado_em: new Date().toISOString() }
      if (body.perfil) patch.perfil = body.perfil
      if (typeof body.ativo === 'boolean') patch.ativo = body.ativo
      if (body.nome !== undefined) patch.nome = String(body.nome || '').trim()

      if (body.username !== undefined) {
        const username = cleanUsername(body.username)
        if (!validUsername(username)) return json({ error: 'Nome de usuário inválido.' }, 400)

        const { data: existing, error: existingError } = await admin
          .from('profiles')
          .select('id')
          .ilike('username', username)
          .neq('id', body.userId)
          .maybeSingle()
        if (existingError) throw existingError
        if (existing) return json({ error: 'Este nome de usuário já está em uso.' }, 409)
        patch.username = username
      }

      if (body.email !== undefined) {
        const email = String(body.email || '').trim().toLowerCase()
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'E-mail inválido.' }, 400)
        const { error: authError } = await admin.auth.admin.updateUserById(body.userId, {
          email,
          email_confirm: true
        })
        if (authError) throw authError
      }

      const { error } = await admin.from('profiles').update(patch).eq('id', body.userId)
      if (error) throw error
      return json({ ok: true })
    }

    return json({ error: 'Ação desconhecida.' }, 400)
  } catch (error) {
    console.error('admin-users:', error)
    return json({ error: error?.message || 'Erro interno na administração de usuários.' }, 500)
  }
}
