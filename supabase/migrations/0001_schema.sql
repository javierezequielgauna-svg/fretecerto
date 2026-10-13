-- =====================================================================
-- FreteCerto Argentina · Fase 1 · Modelo de datos (Supabase / Postgres)
-- Multiempresa con RLS. Dinero en numeric(14,2). Fechas en timestamptz.
-- AVISO: escrito sin correrlo contra una base. Probalo primero en un
-- proyecto de desarrollo de Supabase antes de usarlo con datos reales.
-- =====================================================================

-- ---------- Tipos -----------------------------------------------------
create type rol_miembro      as enum ('dueno','despachante','administrativo','chofer');
create type estado_operacion as enum ('pendiente','en_carga','en_transito','entregada','facturada','cobrada','cancelada');
create type modo_cotizacion  as enum ('viaje','kilo','paquete');
create type estado_cotizacion as enum ('borrador','enviada','aceptada','rechazada','vencida');
create type tipo_vencimiento as enum ('seguro','vtv','licencia','otro');
create type severidad        as enum ('info','atencion','urgente');

-- ---------- Empresas y miembros --------------------------------------
create table empresas (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  cuit            text,
  domicilio       text,
  punto_venta     text not null default '0001',
  objetivo_margen numeric(5,4) not null default 0.30 check (objetivo_margen between 0 and 0.9),
  created_at      timestamptz not null default now()
);

create table miembros (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  rol        rol_miembro not null,
  nombre     text not null,
  telefono   text,                       -- formato WhatsApp: 549 + área + número
  unique (empresa_id, user_id)
);
create index on miembros (user_id, empresa_id);

-- Helpers de permisos (security definer: leen miembros sin pasar por RLS)
create function rol_en(p_empresa uuid) returns rol_miembro
language sql stable security definer set search_path = public as $$
  select rol from miembros where empresa_id = p_empresa and user_id = auth.uid() limit 1
$$;
create function es_miembro(p_empresa uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select rol_en(p_empresa) is not null
$$;
create function es_staff(p_empresa uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(rol_en(p_empresa) in ('dueno','despachante','administrativo'), false)
$$;
create function es_finanzas(p_empresa uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(rol_en(p_empresa) in ('dueno','administrativo'), false)
$$;

create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- Maestros --------------------------------------------------
create table clientes (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid not null references empresas on delete cascade,
  nombre             text not null,
  cuit               text,
  telefono           text,
  direccion          text,
  dias_pago_acordado int not null default 30 check (dias_pago_acordado >= 0),
  created_at         timestamptz not null default now()
);

create table unidades (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references empresas on delete cascade,
  patente             text not null,
  tipo                text,
  capacidad_kg        numeric(10,2) check (capacidad_kg > 0),
  consumo_l_100km     numeric(5,2),
  amortizacion_km     numeric(10,2) not null default 0,   -- $/km
  cubiertas_km        numeric(10,2) not null default 0,   -- $/km
  mantenimiento_km    numeric(10,2) not null default 0,   -- $/km
  seguro_mensual      numeric(14,2) not null default 0,
  odometro_km         int not null default 0,
  activa              boolean not null default true,
  unique (empresa_id, patente)
);

create table choferes (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresas on delete cascade,
  user_id         uuid references auth.users on delete set null,  -- si usa la app
  nombre          text not null,
  dni             text,
  telefono        text,
  costo_dia       numeric(14,2) not null default 0,     -- sueldo + cargas, $/día
  activo          boolean not null default true
);

-- Rutas: caché de lo que devuelve Google Routes (evita pagar dos veces)
create table rutas (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references empresas on delete cascade,
  origen           text not null,
  destino          text not null,
  origen_place_id  text,
  destino_place_id text,
  km               numeric(8,1) not null check (km > 0),
  tiempo_min       int,
  peajes_estimados numeric(14,2) not null default 0,
  fuente           text not null default 'estimado' check (fuente in ('google','manual','estimado')),
  unique (empresa_id, origen, destino)
);

-- Parámetros de costo con historial (se actualizan, no se pisan)
create table parametros_costos (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresas on delete cascade,
  vigente_desde   date not null default current_date,
  precio_gasoil   numeric(10,2) not null,
  viatico_dia     numeric(14,2) not null default 0,
  iibb_pct        numeric(5,4) not null default 0,       -- validar alícuota con tu contador
  indice_costos   numeric(10,4),                         -- para la cláusula de actualización
  unique (empresa_id, vigente_desde)
);

-- ---------- Cotizaciones ---------------------------------------------
create table cotizaciones (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid not null references empresas on delete cascade,
  numero             text not null,
  cliente_id         uuid references clientes,
  ruta_id            uuid references rutas,
  modo               modo_cotizacion not null default 'viaje',
  vuelve_vacio       boolean not null default true,
  kg_reales          numeric(10,2) not null default 0,
  kg_volumetricos    numeric(10,2) not null default 0,   -- cobrar el mayor de ambos
  paquetes           int not null default 0,
  tarifa_unitaria    numeric(14,2),                      -- $/kg o $/paquete
  tarifa_minima      numeric(14,2) not null default 0,
  costo_total        numeric(14,2) not null,
  margen_objetivo    numeric(5,4) not null,
  precio             numeric(14,2) not null,             -- sin IVA
  detalle_costos     jsonb not null default '{}',        -- combustible, peajes, viáticos, etc.
  clausula_indice    boolean not null default false,
  vigencia_hasta     timestamptz,                        -- ej.: now() + 48 h
  estado             estado_cotizacion not null default 'borrador',
  enviada_at         timestamptz,
  ultimo_seguimiento timestamptz,
  created_by         uuid references auth.users default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (empresa_id, numero)
);
create trigger t_cot_upd before update on cotizaciones for each row execute function touch_updated_at();

-- ---------- Operaciones (el corazón) ---------------------------------
create table operaciones (
  id                     uuid primary key default gen_random_uuid(),
  empresa_id             uuid not null references empresas on delete cascade,
  numero                 text not null,
  cotizacion_id          uuid references cotizaciones,
  cliente_id             uuid not null references clientes,
  ruta_id                uuid references rutas,
  chofer_id              uuid references choferes,
  unidad_id              uuid references unidades,
  estado                 estado_operacion not null default 'pendiente',
  fecha_programada       date,
  eta                    timestamptz,
  km                     numeric(8,1) not null default 0,     -- km cargados
  km_vacios              numeric(8,1) not null default 0,     -- retorno sin carga
  kg                     numeric(10,2) not null default 0,
  paquetes               int not null default 0,
  importe                numeric(14,2) not null default 0,    -- sin IVA
  costo_estimado         numeric(14,2) not null default 0,
  costo_real             numeric(14,2),
  remito_conformado_path text,                                -- foto del remito firmado (Storage)
  facturable_at          timestamptz,                         -- se completa al subir el conformado
  entregada_at           timestamptz,
  facturada_at           timestamptz,
  cobrada_at             timestamptz,
  fecha_vencimiento_cobro date,
  token_seguimiento      uuid not null default gen_random_uuid() unique,  -- link público
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (empresa_id, numero)
);
create index on operaciones (empresa_id, estado);
create index on operaciones (empresa_id, cliente_id);
create index on operaciones (chofer_id) where estado in ('pendiente','en_carga','en_transito');

create table eventos_operacion (
  id           bigint generated always as identity primary key,
  empresa_id   uuid not null references empresas on delete cascade,
  operacion_id uuid not null references operaciones on delete cascade,
  estado       estado_operacion not null,
  user_id      uuid default auth.uid(),
  at           timestamptz not null default now()
);
create index on eventos_operacion (operacion_id, at);

-- Reglas de negocio: solo se avanza de a un paso (o se cancela) y se sellan las fechas
create function operaciones_guard() returns trigger language plpgsql as $$
declare
  orden text[] := array['pendiente','en_carga','en_transito','entregada','facturada','cobrada'];
  dias int;
begin
  new.updated_at := now();
  if new.estado is distinct from old.estado then
    if new.estado = 'cancelada' then
      if old.estado = 'cobrada' then raise exception 'Una operación cobrada no se puede cancelar'; end if;
    elsif coalesce(array_position(orden, new.estado::text),0) - coalesce(array_position(orden, old.estado::text),0) <> 1 then
      raise exception 'Transición inválida: % -> %', old.estado, new.estado;
    end if;
    if new.estado = 'entregada' then new.entregada_at := now(); end if;
    if new.estado = 'facturada' then
      new.facturada_at := now();
      select dias_pago_acordado into dias from clientes where id = new.cliente_id;
      new.fecha_vencimiento_cobro := current_date + coalesce(dias,30);
    end if;
    if new.estado = 'cobrada' then new.cobrada_at := now(); end if;
  end if;
  if new.remito_conformado_path is not null and old.remito_conformado_path is null then
    new.facturable_at := now();
  end if;
  return new;
end $$;
create trigger t_op_guard before update on operaciones for each row execute function operaciones_guard();

create function operaciones_evento() returns trigger language plpgsql as $$
begin
  insert into eventos_operacion (empresa_id, operacion_id, estado) values (new.empresa_id, new.id, new.estado);
  return new;
end $$;
create trigger t_op_evt_ins after insert on operaciones for each row execute function operaciones_evento();
create trigger t_op_evt_upd after update of estado on operaciones
  for each row when (old.estado is distinct from new.estado) execute function operaciones_evento();

-- ---------- Remitos, facturas, cobranza ------------------------------
create table contadores (
  empresa_id uuid not null references empresas on delete cascade,
  clave      text not null,                     -- 'remito-0001', 'operacion', 'cotizacion'
  valor      bigint not null default 0,
  primary key (empresa_id, clave)
);
-- Numeración correlativa sin huecos ni duplicados (el upsert bloquea la fila)
create function siguiente_numero(p_empresa uuid, p_clave text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if not es_staff(p_empresa) then raise exception 'Sin permiso'; end if;
  insert into contadores (empresa_id, clave, valor) values (p_empresa, p_clave, 1)
  on conflict (empresa_id, clave) do update set valor = contadores.valor + 1
  returning valor into v;
  return v;
end $$;

create table remitos (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas on delete cascade,
  operacion_id   uuid references operaciones,
  punto_venta    text not null,
  numero         bigint not null,
  tipo           char(1) not null default 'X' check (tipo = 'X'),  -- interno; el electrónico de ARCA va aparte
  fecha          date not null default current_date,
  remitente      jsonb not null,
  destinatario   jsonb not null,
  items          jsonb not null,                -- [{descripcion, bultos, kg}]
  valor_declarado numeric(14,2),
  observaciones  text,
  pdf_path       text,
  created_by     uuid references auth.users default auth.uid(),
  created_at     timestamptz not null default now(),
  unique (empresa_id, punto_venta, numero)
);

-- Registro de facturas emitidas FUERA de la app (ARCA). Ver con el contador cómo integrarlo.
create table facturas (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas on delete cascade,
  operacion_id   uuid references operaciones,
  cliente_id     uuid not null references clientes,
  comprobante    text,                          -- ej.: 'A 0001-00001234'
  fecha_emision  date not null default current_date,
  vencimiento    date,
  monto          numeric(14,2) not null,
  cobrada_at     timestamptz
);

-- ---------- Vencimientos, mantenimiento, alertas ---------------------
create table vencimientos (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references empresas on delete cascade,
  tipo             tipo_vencimiento not null,
  unidad_id        uuid references unidades,
  chofer_id        uuid references choferes,
  fecha_vencimiento date not null,
  avisar_dias      int[] not null default '{30,7,1}',
  telefono_aviso   text,
  check (unidad_id is not null or chofer_id is not null)
);

create table mantenimientos (          -- por kilómetros, no solo por fecha
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas on delete cascade,
  unidad_id   uuid not null references unidades on delete cascade,
  tipo        text not null,           -- 'cubiertas', 'aceite', 'service'
  cada_km     int not null check (cada_km > 0),
  ultimo_km   int not null default 0,
  proximo_km  int generated always as (ultimo_km + cada_km) stored
);

create table alertas (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresas on delete cascade,
  tipo          text not null,         -- 'vencimiento','cotizacion_sin_respuesta','demora','sin_facturar','factura_vencida','service'
  severidad     severidad not null,
  ref_id        uuid,
  dedupe_key    text not null default '',   -- evita avisar dos veces lo mismo
  mensaje       text not null,
  telefono      text,
  generada_at   timestamptz not null default now(),
  notificada_at timestamptz,
  resuelta_at   timestamptz,
  unique (empresa_id, tipo, ref_id, dedupe_key)
);
create index on alertas (empresa_id, resuelta_at) where resuelta_at is null;
-- Fase 4: una tarea programada (Vercel Cron -> route handler) inserta alertas y envía los avisos.

-- Bolsa de retornos: cargas de vuelta que aparecen desde el Gran Córdoba
create table cargas_retorno (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas on delete cascade,
  origen      text not null,
  destino     text not null,
  kg          numeric(10,2),
  fecha       date,
  precio_ofrecido numeric(14,2),
  contacto    text,
  estado      text not null default 'abierta' check (estado in ('abierta','tomada','vencida'))
);

-- ---------- RLS --------------------------------------------------------
alter table empresas          enable row level security;
alter table miembros          enable row level security;
alter table operaciones       enable row level security;
alter table eventos_operacion enable row level security;
alter table contadores        enable row level security;
alter table facturas          enable row level security;

create policy emp_sel  on empresas for select using (es_miembro(id));
create policy emp_upd  on empresas for update using (rol_en(id) = 'dueno') with check (rol_en(id) = 'dueno');
create policy miem_sel on miembros for select using (es_miembro(empresa_id));
create policy miem_w   on miembros for all    using (rol_en(empresa_id) = 'dueno') with check (rol_en(empresa_id) = 'dueno');

create policy op_all   on operaciones for all using (es_staff(empresa_id)) with check (es_staff(empresa_id));
create policy evt_sel  on eventos_operacion for select using (es_staff(empresa_id));
create policy evt_ins  on eventos_operacion for insert with check (es_staff(empresa_id));
create policy fac_all  on facturas for all using (es_finanzas(empresa_id)) with check (es_finanzas(empresa_id));
-- contadores: sin políticas = nadie accede directo; solo siguiente_numero() (security definer)

-- Resto de las tablas: el personal de la empresa lee y escribe; el chofer NO ve costos ni importes
do $$
declare t text;
begin
  foreach t in array array['clientes','unidades','choferes','rutas','parametros_costos','cotizaciones',
                           'remitos','vencimientos','mantenimientos','alertas','cargas_retorno'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all using (es_staff(empresa_id)) with check (es_staff(empresa_id))', t || '_staff', t);
  end loop;
end $$;

-- ---------- Modo chofer: solo lo necesario, sin plata ------------------
create view v_mis_operaciones as          -- corre con permisos del dueño de la vista; filtra por auth.uid()
select o.id, o.numero, o.estado, o.eta, o.kg, o.paquetes,
       r.origen, r.destino, u.patente, cl.nombre as cliente
from operaciones o
join choferes ch on ch.id = o.chofer_id and ch.user_id = auth.uid()
left join rutas r      on r.id = o.ruta_id
left join unidades u   on u.id = o.unidad_id
left join clientes cl  on cl.id = o.cliente_id
where o.estado in ('pendiente','en_carga','en_transito','entregada');

create function avanzar_operacion(p_op uuid, p_estado estado_operacion) returns void
language plpgsql security definer set search_path = public as $$
declare v operaciones; r rol_miembro;
begin
  select * into v from operaciones where id = p_op;
  if not found then raise exception 'Operación inexistente'; end if;
  r := rol_en(v.empresa_id);
  if r is null then raise exception 'Sin acceso'; end if;
  if r = 'chofer' then
    if p_estado not in ('en_carga','en_transito','entregada') then raise exception 'El chofer no puede pasar a %', p_estado; end if;
    if not exists (select 1 from choferes c where c.id = v.chofer_id and c.user_id = auth.uid()) then
      raise exception 'No es tu operación';
    end if;
  end if;
  update operaciones set estado = p_estado where id = p_op;
end $$;

create function registrar_conformado(p_op uuid, p_path text) returns void
language plpgsql security definer set search_path = public as $$
declare v operaciones; r rol_miembro;
begin
  select * into v from operaciones where id = p_op;
  if not found then raise exception 'Operación inexistente'; end if;
  r := rol_en(v.empresa_id);
  if r is null then raise exception 'Sin acceso'; end if;
  if r = 'chofer' and not exists (select 1 from choferes c where c.id = v.chofer_id and c.user_id = auth.uid()) then
    raise exception 'No es tu operación';
  end if;
  if split_part(p_path, '/', 1) <> v.empresa_id::text then raise exception 'Ruta de archivo inválida'; end if;
  update operaciones set remito_conformado_path = p_path where id = p_op;   -- el trigger marca facturable_at
end $$;

-- ---------- Seguimiento público (sin login): solo datos no sensibles ---
create function seguimiento_publico(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('empresa', e.nombre, 'numero', o.numero, 'estado', o.estado,
                            'eta', o.eta, 'origen', r.origen, 'destino', r.destino, 'actualizado', o.updated_at)
  from operaciones o
  join empresas e on e.id = o.empresa_id
  left join rutas r on r.id = o.ruta_id
  where o.token_seguimiento = p_token
$$;

-- ---------- Vistas de rentabilidad y cobranza (respetan RLS) -----------
create view v_cobranza_cliente with (security_invoker = true) as
select c.empresa_id, c.id as cliente_id, c.nombre,
  count(*) filter (where o.estado = 'cobrada')                                         as cobradas,
  round(avg(o.cobrada_at::date - o.facturada_at::date) filter (where o.estado = 'cobrada')) as dias_prom_cobro,
  coalesce(sum(o.importe) filter (where o.estado = 'entregada'), 0)                    as sin_facturar,
  coalesce(sum(o.importe) filter (where o.estado = 'facturada'), 0)                    as por_cobrar,
  -- Puntaje de ejemplo: 100 menos 4 puntos por día promedio de mora. Ajustalo a tu criterio.
  greatest(0, 100 - 4 * coalesce(avg(greatest(o.cobrada_at::date - o.fecha_vencimiento_cobro, 0))
        filter (where o.estado = 'cobrada'), 0))::int                                  as puntaje
from clientes c left join operaciones o on o.cliente_id = c.id
group by c.empresa_id, c.id, c.nombre;

create view v_rentabilidad_ruta with (security_invoker = true) as
select o.empresa_id, r.id as ruta_id, r.origen, r.destino,
  count(*)                                                       as viajes,
  sum(o.importe)                                                 as ingresos,
  sum(coalesce(o.costo_real, o.costo_estimado))                  as costos,
  round((sum(o.importe) - sum(coalesce(o.costo_real, o.costo_estimado))) / nullif(sum(o.importe), 0), 4) as margen,
  round(sum(coalesce(o.costo_real, o.costo_estimado)) / nullif(sum(o.km + o.km_vacios), 0), 2)           as costo_km,
  round(100.0 * sum(o.km_vacios) / nullif(sum(o.km + o.km_vacios), 0), 1)                                as pct_vacio,
  round(100.0 * count(*) filter (where o.entregada_at <= o.eta)
        / nullif(count(*) filter (where o.entregada_at is not null), 0), 1)                              as pct_a_tiempo
from operaciones o join rutas r on r.id = o.ruta_id
where o.estado <> 'cancelada'
group by o.empresa_id, r.id, r.origen, r.destino;
-- Para margen por cliente, chofer o unidad: copiá la vista cambiando el join y el group by.

-- ---------- Storage: fotos de remitos conformados y PDFs ---------------
-- Ruta de archivo: {empresa_id}/{operacion_id}/{archivo}
insert into storage.buckets (id, name, public) values ('remitos', 'remitos', false) on conflict do nothing;

create policy remitos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'remitos' and es_miembro(((storage.foldername(name))[1])::uuid));
create policy remitos_leer on storage.objects for select to authenticated
  using (bucket_id = 'remitos' and (es_staff(((storage.foldername(name))[1])::uuid) or owner = auth.uid()));

-- ---------- Permisos de ejecución ---------------------------------------
revoke execute on all functions in schema public from public, anon;
grant  execute on all functions in schema public to authenticated;
grant  execute on function seguimiento_publico(uuid) to anon;
grant  select  on v_mis_operaciones to authenticated;
