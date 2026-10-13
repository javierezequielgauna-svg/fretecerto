-- Fase 4: alertas con notificaciones y mantenimiento por kilómetros.

-- Mensaje listo para mandar por WhatsApp a quien corresponda (chofer, cliente)
alter table alertas add column if not exists mensaje_wa text;

-- Al entregar una operación, el odómetro de la unidad suma los km recorridos (cargados + vacíos)
create function sumar_odometro() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.unidad_id is not null then
    update unidades set odometro_km = odometro_km + round(new.km + new.km_vacios)::int where id = new.unidad_id;
  end if;
  return new;
end $$;
create trigger t_op_odometro after update of estado on operaciones
  for each row when (new.estado = 'entregada' and old.estado is distinct from new.estado) execute function sumar_odometro();

create index if not exists alertas_abiertas_idx on alertas (empresa_id, severidad) where resuelta_at is null;
