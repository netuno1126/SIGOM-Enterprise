-- SIGOM Fase 12.6 — Login por e-mail ou nome de usuário
-- Idempotente e não destrutivo.
begin;

alter table public.profiles
  add column if not exists username text;

-- Normaliza nomes já existentes sem alterar e-mails ou autenticação.
update public.profiles
set username = lower(regexp_replace(coalesce(username,''), '[^a-zA-Z0-9._-]+', '', 'g'))
where username is not null;

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null and btrim(username) <> '';

alter table public.profiles
  drop constraint if exists profiles_username_formato_check;

alter table public.profiles
  add constraint profiles_username_formato_check
  check (username is null or username ~ '^[a-z0-9._-]{3,40}$') not valid;

-- O e-mail continua pertencendo ao Supabase Auth. O username é apenas um
-- identificador alternativo resolvido pela Netlify Function protegida.
grant select on public.profiles to authenticated;

commit;

-- Conferência opcional:
-- select id,nome,username,perfil,ativo from public.profiles order by nome;
