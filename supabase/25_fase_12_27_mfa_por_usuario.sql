begin;

alter table public.profiles
  add column if not exists mfa_obrigatorio boolean not null default true;

update public.profiles p
set mfa_obrigatorio = false
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('apg@dom.com');

update public.profiles p
set mfa_obrigatorio = true
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('fabiobarboza.dom@gmail.com');

comment on column public.profiles.mfa_obrigatorio is
'Indica se o SIGOM deve exigir MFA/AAL2 para este usuário.';

commit;


-- A interface administrativa da Fase 12.28 lê e altera este campo.
-- Nenhuma política adicional é necessária porque a alteração é feita
-- pela Netlify Function protegida com service role e validação de administrador.
