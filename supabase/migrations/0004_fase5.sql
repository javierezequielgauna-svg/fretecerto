-- Fase 5: link público "seguí tu carga" y modo chofer.

-- Seguimiento público: solo datos no sensibles. Facturada y cobrada se muestran como "entregada";
-- nunca salen precios, cliente, chofer ni patente.
create or replace function seguimiento_publico(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'empresa', e.nombre,
    'numero', o.numero,
    'estado', case when o.estado in ('facturada','cobrada') then 'entregada' else o.estado::text end,
    'eta', o.eta,
    'origen', r.origen,
    'destino', r.destino,
    'actualizado', o.updated_at,
    'eventos', coalesce((
      select jsonb_agg(jsonb_build_object('estado', ev.estado, 'at', ev.at) order by ev.at)
      from eventos_operacion ev
      where ev.operacion_id = o.id and ev.estado in ('pendiente','en_carga','en_transito','entregada')
    ), '[]'::jsonb)
  )
  from operaciones o
  join empresas e on e.id = o.empresa_id
  left join rutas r on r.id = o.ruta_id
  where o.token_seguimiento = p_token
$$;
grant execute on function seguimiento_publico(uuid) to anon, authenticated;

-- Vista del chofer: suma si ya subió la foto del remito firmado (columnas nuevas al final).
create or replace view v_mis_operaciones as
select o.id, o.numero, o.estado, o.eta, o.kg, o.paquetes,
       r.origen, r.destino, u.patente, cl.nombre as cliente,
       o.fecha_programada, (o.remito_conformado_path is not null) as conformado
from operaciones o
join choferes ch on ch.id = o.chofer_id and ch.user_id = auth.uid()
left join rutas r      on r.id = o.ruta_id
left join unidades u   on u.id = o.unidad_id
left join clientes cl  on cl.id = o.cliente_id
where o.estado in ('pendiente','en_carga','en_transito','entregada');
grant select on v_mis_operaciones to authenticated;
