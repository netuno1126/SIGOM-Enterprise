-- Fase 1: verificação não destrutiva da fundação SIGOM
select id, nome, perfil, ativo from public.profiles order by criado_em;
select count(*) as obras from public.obras;
select count(*) as grupos from public.grupos;
select count(*) as vinculos_grupos from public.grupo_obras;
-- A aplicação exige AAL2 no frontend. Nas políticas sensíveis futuras, usar:
-- (select auth.jwt()->>'aal') = 'aal2'
