-- SIGOM 2026 V31.0 GOLD
-- Substitua o e-mail abaixo pelo e-mail do usuário que deverá ser administrador.

do $$
declare
  v_email text := 'SEU_EMAIL_AQUI';
  v_uid uuid;
begin
  select id into v_uid
  from auth.users
  where lower(email) = lower(v_email)
  limit 1;

  if v_uid is null then
    raise exception 'Usuário não encontrado em Authentication > Users: %', v_email;
  end if;

  insert into public.profiles (id, nome, perfil, ativo)
  values (
    v_uid,
    coalesce((select raw_user_meta_data->>'nome' from auth.users where id=v_uid), split_part(v_email,'@',1)),
    'administrador',
    true
  )
  on conflict (id) do update
  set perfil='administrador',
      ativo=true,
      atualizado_em=now();

  raise notice 'Usuário % promovido para administrador.', v_email;
end $$;
