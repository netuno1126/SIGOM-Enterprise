-- Depois de criar o primeiro usuário em Authentication > Users,
-- substitua o e-mail abaixo e execute este comando.
update public.profiles p
set perfil='administrador', ativo=true, atualizado_em=now()
from auth.users u
where p.id=u.id and lower(u.email)=lower('SEU_EMAIL_AQUI');
