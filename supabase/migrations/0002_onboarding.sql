-- Primer ingreso: crea la empresa y te deja como dueño (RLS no permite insertar directo).
create function crear_empresa(p_nombre text, p_nombre_usuario text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
  if exists (select 1 from miembros where user_id = auth.uid()) then
    raise exception 'Ya pertenecés a una empresa';
  end if;
  insert into empresas (nombre) values (trim(p_nombre)) returning id into v;
  insert into miembros (empresa_id, user_id, rol, nombre) values (v, auth.uid(), 'dueno', trim(p_nombre_usuario));
  return v;
end $$;
revoke execute on function crear_empresa(text, text) from public, anon;
grant  execute on function crear_empresa(text, text) to authenticated;
