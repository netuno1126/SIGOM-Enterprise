-- SIGOM 2026 V30.2 — Grupos, subgrupos e usuários
-- Seguro para executar mais de uma vez.

create index if not exists grupos_pai_idx on public.grupos(grupo_pai_id);
create index if not exists grupos_arquivado_idx on public.grupos(arquivado,nome);
create index if not exists grupo_obras_obra_idx on public.grupo_obras(obra_id);

-- Impede ciclos simples (um grupo ser pai de si mesmo).
alter table public.grupos drop constraint if exists grupos_nao_auto_pai;
alter table public.grupos add constraint grupos_nao_auto_pai check (grupo_pai_id is null or grupo_pai_id <> id);

-- Garante unicidade também para grupos principais, pois UNIQUE com NULL permite duplicatas no PostgreSQL.
create unique index if not exists grupos_nome_raiz_uidx on public.grupos(lower(nome)) where grupo_pai_id is null;
create unique index if not exists grupos_nome_pai_uidx on public.grupos(grupo_pai_id,lower(nome)) where grupo_pai_id is not null;

-- Auditoria automática para grupos e vínculos.
create or replace function public.audit_grupos_v30_2()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.auditoria_logs(usuario_id,acao,entidade,entidade_id,antes,depois)
  values(auth.uid(),tg_op,'grupos',coalesce(new.id,old.id)::text,
         case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
         case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new,old);
end;$$;

drop trigger if exists trg_audit_grupos_v30_2 on public.grupos;
create trigger trg_audit_grupos_v30_2 after insert or update or delete on public.grupos
for each row execute procedure public.audit_grupos_v30_2();

create or replace function public.audit_grupo_obras_v30_2()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.auditoria_logs(usuario_id,acao,entidade,entidade_id,antes,depois)
  values(auth.uid(),tg_op,'grupo_obras',coalesce(new.grupo_id,old.grupo_id)::text||':'||coalesce(new.obra_id,old.obra_id)::text,
         case when tg_op='DELETE' then to_jsonb(old) end,
         case when tg_op='INSERT' then to_jsonb(new) end);
  return coalesce(new,old);
end;$$;

drop trigger if exists trg_audit_grupo_obras_v30_2 on public.grupo_obras;
create trigger trg_audit_grupo_obras_v30_2 after insert or delete on public.grupo_obras
for each row execute procedure public.audit_grupo_obras_v30_2();
