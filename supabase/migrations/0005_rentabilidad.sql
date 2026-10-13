-- Fase 6: rentabilidad por ruta, cliente, chofer o unidad, con período.
-- security invoker: respeta RLS, cada empresa ve solo lo suyo y el chofer no accede (es_staff).
create or replace function rentabilidad(p_dim text, p_desde date default null)
returns table (clave uuid, nombre text, viajes bigint, ingresos numeric, costos numeric, margen numeric, costo_km numeric, pct_vacio numeric, pct_a_tiempo numeric)
language sql stable security invoker set search_path = public as $$
  select
    case p_dim when 'ruta' then o.ruta_id when 'cliente' then o.cliente_id when 'chofer' then o.chofer_id else o.unidad_id end as clave,
    coalesce(case p_dim when 'ruta' then r.origen || ' a ' || r.destino when 'cliente' then c.nombre when 'chofer' then ch.nombre else u.patente end, 'Sin asignar') as nombre,
    count(*)                                                                                   as viajes,
    sum(o.importe)                                                                             as ingresos,
    sum(coalesce(o.costo_real, o.costo_estimado))                                              as costos,
    round((sum(o.importe) - sum(coalesce(o.costo_real, o.costo_estimado))) / nullif(sum(o.importe), 0), 4) as margen,
    round(sum(coalesce(o.costo_real, o.costo_estimado)) / nullif(sum(o.km + o.km_vacios), 0), 2)           as costo_km,
    round(100.0 * sum(o.km_vacios) / nullif(sum(o.km + o.km_vacios), 0), 1)                                as pct_vacio,
    round(100.0 * count(*) filter (where o.entregada_at is not null and o.eta is not null and o.entregada_at <= o.eta)
          / nullif(count(*) filter (where o.entregada_at is not null and o.eta is not null), 0), 1)        as pct_a_tiempo
  from operaciones o
  left join rutas r     on r.id = o.ruta_id
  left join clientes c  on c.id = o.cliente_id
  left join choferes ch on ch.id = o.chofer_id
  left join unidades u  on u.id = o.unidad_id
  where o.estado not in ('pendiente', 'cancelada')
    and (p_desde is null or o.created_at::date >= p_desde)
  group by 1, 2
$$;
grant execute on function rentabilidad(text, date) to authenticated;
