-- SIGOM 2026 V30.5 — FIO online
-- Pode ser executado mais de uma vez.

create index if not exists fio_edicoes_obra_editado_idx on public.fio_edicoes(obra_id, editado_em desc);
create index if not exists fio_edicoes_editado_por_idx on public.fio_edicoes(editado_por);

create or replace function public.registrar_fio_auditoria()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.auditoria_logs(usuario_id,acao,entidade,entidade_id,depois)
  values(new.editado_por,'SALVAR_FIO','fio_edicoes',new.id::text,to_jsonb(new));
  return new;
end;$$;

drop trigger if exists trg_fio_auditoria on public.fio_edicoes;
create trigger trg_fio_auditoria after insert on public.fio_edicoes
for each row execute procedure public.registrar_fio_auditoria();

-- Recria políticas do Storage de modo idempotente.
drop policy if exists fio_storage_read on storage.objects;
drop policy if exists fio_storage_insert on storage.objects;
drop policy if exists fio_storage_update on storage.objects;
drop policy if exists fio_storage_delete on storage.objects;
create policy fio_storage_read on storage.objects for select to authenticated using (bucket_id='fio-fotos');
create policy fio_storage_insert on storage.objects for insert to authenticated with check (bucket_id='fio-fotos' and public.pode_editar());
create policy fio_storage_update on storage.objects for update to authenticated using (bucket_id='fio-fotos' and public.pode_editar()) with check (bucket_id='fio-fotos' and public.pode_editar());
create policy fio_storage_delete on storage.objects for delete to authenticated using (bucket_id='fio-fotos' and public.pode_editar());
