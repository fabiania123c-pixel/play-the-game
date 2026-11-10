-- =====================================================================
-- Play the Game · EQUINOX · Esquema inicial (schema ptg_eqx)
-- Separado por completo de Marathon (schema ptg): tablas, PIN, personas y configuración propios.
-- Todo vive en el schema "ptg_eqx" para no mezclarse con otras apps del mismo
-- proyecto de Supabase. Ejecutar completo en SQL Editor → New query → Run.
-- Después: Project Settings → API → Exposed schemas → agregar "ptg_eqx".
-- =====================================================================

create schema if not exists ptg_eqx;
set search_path to ptg_eqx, public;


-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

-- Empresas y países que participan. Agregar una fila = nueva opción en la app.
create table if not exists ptg_eqx.unidades (
  codigo   text primary key check (codigo ~ '^[A-Z]{3}-[A-Z]{2}$'),
  empresa  text not null,
  pais     text not null check (pais in ('EC','PE','CL','BO','CO')),
  orden    int  not null default 0
);
insert into ptg_eqx.unidades (codigo, empresa, pais, orden) values
  ('EQX-EC','Equinox','EC',1),('EQX-PE','Equinox','PE',2),('EQX-CL','Equinox','CL',3)
on conflict (codigo) do nothing;

-- Acceso a RRHH por país (cubre todas las empresas de ese país). '*' = regional
-- (permanente). Un país se habilita al escribir su PIN y dura 12 horas (columna hasta).
create table if not exists ptg_eqx.admins (
  email   text not null check (email = lower(email)),
  pais    text not null check (pais in ('*','EC','PE','CL','BO','CO')),
  hasta   timestamptz,
  creado  timestamptz not null default now(),
  primary key (email, pais)
);

-- PIN por país (guardado con hash; nadie puede leerlo desde la app)
create table if not exists ptg_eqx.pins (
  pais        text primary key check (pais in ('EC','PE','CL','BO','CO')),
  salt        text not null,
  hash        text not null,
  actualizado timestamptz not null default now()
);

-- Intentos fallidos de PIN (para bloquear 15 minutos después de 5)
create table if not exists ptg_eqx.pin_intentos (
  email   text not null,
  creado  timestamptz not null default now()
);
create index if not exists pin_intentos_email on ptg_eqx.pin_intentos (email, creado);

-- Dominios de correo de la empresa: solo esos correos (y RRHH regional) pueden entrar
create table if not exists ptg_eqx.dominios (
  dominio text primary key check (dominio = lower(dominio))
);

-- Configuración: 'temporada' = valores regionales; 'EQX-EC', 'EQX-PE'… = por empresa y país
create table if not exists ptg_eqx.config (
  unidad          text primary key check (unidad = 'temporada' or unidad ~ '^[A-Z]{3}-[A-Z]{2}$'),
  nombre          text not null default '',
  max_por_persona int  not null default 0 check (max_por_persona >= 0),
  abiertas        boolean not null default true,
  limite          date,
  mensaje         text not null default '',
  firma           text not null default '',
  actualizado     timestamptz not null default now()
);

create table if not exists ptg_eqx.tiendas (
  id      uuid primary key default gen_random_uuid(),
  nombre  text not null check (length(trim(nombre)) > 0),
  ciudad  text not null check (length(trim(ciudad)) > 0),
  unidad  text not null references ptg_eqx.unidades(codigo),
  email   text not null default '',
  creado  timestamptz not null default now()
);
create unique index if not exists tiendas_unicas on ptg_eqx.tiendas (lower(nombre), lower(ciudad), unidad);

create table if not exists ptg_eqx.turnos (
  id         uuid primary key default gen_random_uuid(),
  tienda_id  uuid not null references ptg_eqx.tiendas(id) on delete cascade,
  fecha      date not null,
  inicio     time not null,
  fin        time not null,
  cupos      int  not null default 2 check (cupos between 1 and 20),
  prioridad  boolean not null default false,
  creado     timestamptz not null default now(),
  check (fin > inicio),
  unique (tienda_id, fecha, inicio, fin)
);
create index if not exists turnos_fecha on ptg_eqx.turnos (fecha);

-- Datos del colaborador (nombre, área, país)
create table if not exists ptg_eqx.perfiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  nombre      text not null default '',
  area        text not null default '',
  unidad      text references ptg_eqx.unidades(codigo),
  actualizado timestamptz not null default now()
);

create table if not exists ptg_eqx.reservas (
  id          uuid primary key default gen_random_uuid(),
  turno_id    uuid not null references ptg_eqx.turnos(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text not null,
  nombre      text not null,
  area        text not null default '',
  asistencia  text check (asistencia in ('si','no')),
  en_outlook  boolean not null default false,   -- true cuando la persona abrió Outlook desde la app
  en_outlook_en timestamptz,
  creado      timestamptz not null default now(),
  unique (turno_id, user_id)
);
create index if not exists reservas_user on ptg_eqx.reservas (user_id);

-- Cambios para avisar a las tiendas (los crean los triggers, nunca el navegador)
create table if not exists ptg_eqx.avisos (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('cancelacion','retirado','turno_eliminado','cambio_horario')),
  tienda_id   uuid not null,
  unidad        text not null,
  turno_id    uuid,
  fecha       date not null,
  inicio      time not null,
  fin         time not null,
  user_id     uuid,
  email       text,
  nombre      text,
  area        text,
  antes       text,
  enviado     boolean not null default false,
  enviado_en  timestamptz,
  creado      timestamptz not null default now()
);
create index if not exists avisos_pend on ptg_eqx.avisos (unidad) where not enviado;

-- Lista de personal convocado por país (Marathon y Equinox juntos)
create table if not exists ptg_eqx.convocados (
  pais        text primary key check (pais in ('EC','PE','CL','BO','CO')),
  personas    jsonb not null default '[]'::jsonb,
  actualizado timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Funciones de apoyo para permisos
-- ---------------------------------------------------------------------
create or replace function ptg_eqx.mi_email() returns text
language sql stable set search_path = '' as $$ select lower(coalesce(auth.jwt()->>'email','')) $$;

-- ¿Gestiona este país? (p = 'EC', 'PE'…)
create or replace function ptg_eqx.es_admin_pais(p text) returns boolean
language sql stable security definer set search_path = ptg_eqx as $$
  select exists (select 1 from admins where email = mi_email() and (pais = '*' or pais = p)
                 and (hasta is null or hasta > now()))
$$;

-- ¿Gestiona esta empresa y país? (p = 'EQX-EC', 'EQX-PE'…) → según su país
create or replace function ptg_eqx.es_admin(p text) returns boolean
language sql stable security definer set search_path = ptg_eqx as $$
  select es_admin_pais((select u.pais from unidades u where u.codigo = p))
$$;

create or replace function ptg_eqx.es_regional() returns boolean
language sql stable security definer set search_path = ptg_eqx as $$
  select exists (select 1 from admins where email = mi_email() and pais = '*'
                 and (hasta is null or hasta > now()))
$$;

create or replace function ptg_eqx.permitido() returns boolean
language sql stable security definer set search_path = ptg_eqx as $$
  select auth.uid() is not null and (
       exists (select 1 from dominios d where mi_email() like '%@' || d.dominio)
    or exists (select 1 from admins where email = mi_email() and (hasta is null or hasta > now()))
  )
$$;

create or replace function ptg_eqx.unidad_tienda(t uuid) returns text
language sql stable security definer set search_path = ptg_eqx as $$
  select unidad from tiendas where id = t
$$;

create or replace function ptg_eqx.unidad_turno(t uuid) returns text
language sql stable security definer set search_path = ptg_eqx as $$
  select ti.unidad from turnos tu join tiendas ti on ti.id = tu.tienda_id where tu.id = t
$$;

-- ---------------------------------------------------------------------
-- PIN por país
-- ---------------------------------------------------------------------
create or replace function ptg_eqx.pin_hash(p_salt text, p_pin text) returns text
language sql immutable set search_path = '' as $$ select encode(sha256(convert_to(p_salt || ':' || p_pin, 'UTF8')), 'hex') $$;

-- Qué países tienen PIN configurado (solo regional)
create or replace function ptg_eqx.pin_estado() returns setof text
language sql stable security definer set search_path = ptg_eqx as $$
  select pais from pins where es_regional() order by pais
$$;

-- Crear o cambiar el PIN de un país (solo regional). Cierra los accesos abiertos de ese país.
create or replace function ptg_eqx.set_pin(p_pais text, p_pin text) returns void
language plpgsql security definer set search_path = ptg_eqx as $$
declare v_salt text := md5(random()::text || clock_timestamp()::text);
begin
  if not es_regional() then raise exception 'NO_REGIONAL'; end if;
  if not exists (select 1 from unidades where pais = p_pais) then raise exception 'PAIS_INVALIDO'; end if;
  if p_pin !~ '^[0-9]{4,6}$' then raise exception 'PIN_INVALIDO'; end if;
  insert into pins (pais, salt, hash, actualizado) values (p_pais, v_salt, pin_hash(v_salt, p_pin), now())
  on conflict (pais) do update set salt = excluded.salt, hash = excluded.hash, actualizado = now();
  delete from admins where pais = p_pais and hasta is not null;
end $$;

-- Entrar como RRHH de un país con su PIN. Devuelve: ok | mal | bloqueado | sin_pin | no_auth
create or replace function ptg_eqx.entrar_rrhh(p_pais text, p_pin text) returns text
language plpgsql security definer set search_path = ptg_eqx as $$
declare r pins%rowtype;
begin
  if not permitido() then return 'no_auth'; end if;
  if (select count(*) from pin_intentos where email = mi_email() and creado > now() - interval '15 minutes') >= 5 then
    return 'bloqueado';
  end if;
  select * into r from pins where pais = p_pais;
  if not found then return 'sin_pin'; end if;
  if pin_hash(r.salt, coalesce(p_pin,'')) <> r.hash then
    insert into pin_intentos (email) values (mi_email());
    return 'mal';
  end if;
  insert into admins (email, pais, hasta) values (mi_email(), p_pais, now() + interval '12 hours')
  on conflict (email, pais) do update set hasta = case when admins.hasta is null then null else excluded.hasta end;
  delete from pin_intentos where email = mi_email();
  return 'ok';
end $$;

-- Salir del panel de un país (el regional no se quita)
create or replace function ptg_eqx.salir_rrhh(p_pais text) returns void
language sql security definer set search_path = ptg_eqx as $$
  delete from admins where email = mi_email() and pais = p_pais and hasta is not null
$$;

-- ---------------------------------------------------------------------
-- Reservar: única forma de crear una reserva. Bloquea el turno mientras
-- cuenta cupos, así dos personas no pueden tomar el mismo cupo.
-- ---------------------------------------------------------------------
create or replace function ptg_eqx.reservar(p_turno uuid) returns uuid
language plpgsql security definer set search_path = ptg_eqx as $$
declare
  t      turnos%rowtype;
  v_unidad text;
  pf     perfiles%rowtype;
  c      config%rowtype;
  n      int;
  v_id   uuid;
begin
  if not permitido() then raise exception 'NO_AUTH'; end if;

  select * into t from turnos where id = p_turno for update;
  if not found then raise exception 'NO_TURNO'; end if;
  if t.fecha < current_date then raise exception 'PASADO'; end if;

  select unidad into v_unidad from tiendas where id = t.tienda_id;

  select * into pf from perfiles where user_id = auth.uid();
  if not found or trim(pf.nombre) = '' or trim(pf.area) = '' then raise exception 'SIN_PERFIL'; end if;

  select * into c from config where unidad = v_unidad;
  if not found then select * into c from config where unidad = 'temporada'; end if;
  if coalesce(c.abiertas, true) = false then raise exception 'CERRADAS'; end if;

  if exists (select 1 from reservas where turno_id = p_turno and user_id = auth.uid()) then
    raise exception 'YA';
  end if;

  select count(*) into n from reservas where turno_id = p_turno;
  if n >= t.cupos then raise exception 'LLENO'; end if;

  if exists (
    select 1 from reservas r join turnos x on x.id = r.turno_id
    where r.user_id = auth.uid() and x.fecha = t.fecha and x.inicio < t.fin and t.inicio < x.fin
  ) then raise exception 'CRUCE'; end if;

  if coalesce(c.max_por_persona, 0) > 0 and (
    select count(*) from reservas r join turnos x on x.id = r.turno_id
    where r.user_id = auth.uid() and x.fecha >= current_date
  ) >= c.max_por_persona then raise exception 'MAX'; end if;

  insert into reservas (turno_id, user_id, email, nombre, area)
  values (p_turno, auth.uid(), mi_email(), trim(pf.nombre), trim(pf.area))
  returning id into v_id;
  return v_id;
end $$;

-- La persona abrió Outlook desde la app para agendar su turno
create or replace function ptg_eqx.confirmar_calendario(p_reserva uuid) returns void
language plpgsql security definer set search_path = ptg_eqx as $$
begin
  update reservas set en_outlook = true, en_outlook_en = now()
  where id = p_reserva and user_id = auth.uid();
  if not found then raise exception 'NO_RESERVA'; end if;
end $$;

-- ---------------------------------------------------------------------
-- Avisos automáticos para las tiendas
-- ---------------------------------------------------------------------

-- Alguien cancela, o RRHH lo retira
create or replace function ptg_eqx.tg_reserva_borrada() returns trigger
language plpgsql security definer set search_path = ptg_eqx as $$
declare t turnos%rowtype; v_unidad text;
begin
  select * into t from turnos where id = old.turno_id;
  if not found or t.fecha < current_date then return old; end if; -- turno eliminado: lo avisa su propio trigger
  select unidad into v_unidad from tiendas where id = t.tienda_id;
  insert into avisos (tipo, tienda_id, unidad, turno_id, fecha, inicio, fin, user_id, email, nombre, area)
  values (case when auth.uid() = old.user_id then 'cancelacion' else 'retirado' end,
          t.tienda_id, v_unidad, t.id, t.fecha, t.inicio, t.fin, old.user_id, old.email, old.nombre, old.area);
  return old;
end $$;
drop trigger if exists reserva_borrada on ptg_eqx.reservas;
create trigger reserva_borrada after delete on ptg_eqx.reservas
  for each row execute function ptg_eqx.tg_reserva_borrada();

-- RRHH elimina un turno con personas inscritas
create or replace function ptg_eqx.tg_turno_borrado() returns trigger
language plpgsql security definer set search_path = ptg_eqx as $$
declare v_unidad text;
begin
  if old.fecha < current_date then return old; end if;
  select unidad into v_unidad from tiendas where id = old.tienda_id;
  if not found then return old; end if; -- se está borrando la tienda completa
  insert into avisos (tipo, tienda_id, unidad, turno_id, fecha, inicio, fin, user_id, email, nombre, area)
  select 'turno_eliminado', old.tienda_id, v_unidad, old.id, old.fecha, old.inicio, old.fin,
         r.user_id, r.email, r.nombre, r.area
  from reservas r where r.turno_id = old.id;
  return old;
end $$;
drop trigger if exists turno_borrado on ptg_eqx.turnos;
create trigger turno_borrado before delete on ptg_eqx.turnos
  for each row execute function ptg_eqx.tg_turno_borrado();

-- No bajar cupos por debajo de los inscritos
create or replace function ptg_eqx.tg_turno_cupos() returns trigger
language plpgsql security definer set search_path = ptg_eqx as $$
begin
  if new.cupos < (select count(*) from reservas where turno_id = new.id) then
    raise exception 'CUPOS_MENORES';
  end if;
  return new;
end $$;
drop trigger if exists turno_cupos on ptg_eqx.turnos;
create trigger turno_cupos before update of cupos on ptg_eqx.turnos
  for each row execute function ptg_eqx.tg_turno_cupos();

-- RRHH cambia el horario de un turno con personas inscritas
create or replace function ptg_eqx.tg_turno_horario() returns trigger
language plpgsql security definer set search_path = ptg_eqx as $$
declare v_unidad text;
begin
  if (new.inicio, new.fin) is distinct from (old.inicio, old.fin) and new.fecha >= current_date then
    select unidad into v_unidad from tiendas where id = new.tienda_id;
    insert into avisos (tipo, tienda_id, unidad, turno_id, fecha, inicio, fin, user_id, email, nombre, area, antes)
    select 'cambio_horario', new.tienda_id, v_unidad, new.id, new.fecha, new.inicio, new.fin,
           r.user_id, r.email, r.nombre, r.area,
           to_char(old.inicio, 'HH24:MI') || '–' || to_char(old.fin, 'HH24:MI')
    from reservas r where r.turno_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists turno_horario on ptg_eqx.turnos;
create trigger turno_horario after update on ptg_eqx.turnos
  for each row execute function ptg_eqx.tg_turno_horario();

-- ---------------------------------------------------------------------
-- Seguridad por filas (RLS)
-- ---------------------------------------------------------------------
alter table ptg_eqx.admins     enable row level security;
alter table ptg_eqx.dominios   enable row level security;
alter table ptg_eqx.config     enable row level security;
alter table ptg_eqx.tiendas    enable row level security;
alter table ptg_eqx.turnos     enable row level security;
alter table ptg_eqx.perfiles   enable row level security;
alter table ptg_eqx.reservas   enable row level security;
alter table ptg_eqx.avisos     enable row level security;
alter table ptg_eqx.convocados enable row level security;
alter table ptg_eqx.unidades   enable row level security;
alter table ptg_eqx.pins       enable row level security;   -- sin políticas: solo las funciones lo leen
alter table ptg_eqx.pin_intentos enable row level security; -- sin políticas

-- unidades: todos con sesión las ven; solo regional las cambia
drop policy if exists unidades_sel on ptg_eqx.unidades;
create policy unidades_sel on ptg_eqx.unidades for select to authenticated using (permitido());
drop policy if exists unidades_all on ptg_eqx.unidades;
create policy unidades_all on ptg_eqx.unidades for all to authenticated using (es_regional()) with check (es_regional());

-- admins: cada uno ve su fila; el regional ve y gestiona todo
drop policy if exists admins_sel on ptg_eqx.admins;
create policy admins_sel on ptg_eqx.admins for select to authenticated using (email = mi_email() or es_regional());
drop policy if exists admins_ins on ptg_eqx.admins;
create policy admins_ins on ptg_eqx.admins for insert to authenticated with check (es_regional());
drop policy if exists admins_upd on ptg_eqx.admins;
create policy admins_upd on ptg_eqx.admins for update to authenticated using (es_regional()) with check (es_regional());
drop policy if exists admins_del on ptg_eqx.admins;
create policy admins_del on ptg_eqx.admins for delete to authenticated using (es_regional() and not (email = mi_email() and pais = '*'));

-- dominios
drop policy if exists dominios_sel on ptg_eqx.dominios;
create policy dominios_sel on ptg_eqx.dominios for select to authenticated using (es_regional());
drop policy if exists dominios_all on ptg_eqx.dominios;
create policy dominios_all on ptg_eqx.dominios for all to authenticated using (es_regional()) with check (es_regional());

-- config
drop policy if exists config_sel on ptg_eqx.config;
create policy config_sel on ptg_eqx.config for select to authenticated using (permitido());
drop policy if exists config_ins on ptg_eqx.config;
create policy config_ins on ptg_eqx.config for insert to authenticated
  with check ((unidad = 'temporada' and es_regional()) or (unidad <> 'temporada' and es_admin(unidad)));
drop policy if exists config_upd on ptg_eqx.config;
create policy config_upd on ptg_eqx.config for update to authenticated
  using ((unidad = 'temporada' and es_regional()) or (unidad <> 'temporada' and es_admin(unidad)))
  with check ((unidad = 'temporada' and es_regional()) or (unidad <> 'temporada' and es_admin(unidad)));

-- tiendas
drop policy if exists tiendas_sel on ptg_eqx.tiendas;
create policy tiendas_sel on ptg_eqx.tiendas for select to authenticated using (permitido());
drop policy if exists tiendas_ins on ptg_eqx.tiendas;
create policy tiendas_ins on ptg_eqx.tiendas for insert to authenticated with check (es_admin(unidad));
drop policy if exists tiendas_upd on ptg_eqx.tiendas;
create policy tiendas_upd on ptg_eqx.tiendas for update to authenticated using (es_admin(unidad)) with check (es_admin(unidad));
drop policy if exists tiendas_del on ptg_eqx.tiendas;
create policy tiendas_del on ptg_eqx.tiendas for delete to authenticated using (es_admin(unidad));

-- turnos
drop policy if exists turnos_sel on ptg_eqx.turnos;
create policy turnos_sel on ptg_eqx.turnos for select to authenticated using (permitido());
drop policy if exists turnos_ins on ptg_eqx.turnos;
create policy turnos_ins on ptg_eqx.turnos for insert to authenticated with check (es_admin(unidad_tienda(tienda_id)));
drop policy if exists turnos_upd on ptg_eqx.turnos;
create policy turnos_upd on ptg_eqx.turnos for update to authenticated
  using (es_admin(unidad_tienda(tienda_id))) with check (es_admin(unidad_tienda(tienda_id)));
drop policy if exists turnos_del on ptg_eqx.turnos;
create policy turnos_del on ptg_eqx.turnos for delete to authenticated using (es_admin(unidad_tienda(tienda_id)));

-- perfiles: cada persona solo el suyo
drop policy if exists perfiles_sel on ptg_eqx.perfiles;
create policy perfiles_sel on ptg_eqx.perfiles for select to authenticated using (user_id = auth.uid());
drop policy if exists perfiles_ins on ptg_eqx.perfiles;
create policy perfiles_ins on ptg_eqx.perfiles for insert to authenticated with check (user_id = auth.uid() and email = mi_email());
drop policy if exists perfiles_upd on ptg_eqx.perfiles;
create policy perfiles_upd on ptg_eqx.perfiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and email = mi_email());

-- reservas: todos ven quién va (para mostrar "Van: ..."); se crean solo con reservar()
drop policy if exists reservas_sel on ptg_eqx.reservas;
create policy reservas_sel on ptg_eqx.reservas for select to authenticated using (permitido());
drop policy if exists reservas_upd on ptg_eqx.reservas;
create policy reservas_upd on ptg_eqx.reservas for update to authenticated
  using (es_admin(unidad_turno(turno_id))) with check (es_admin(unidad_turno(turno_id)));
drop policy if exists reservas_del on ptg_eqx.reservas;
create policy reservas_del on ptg_eqx.reservas for delete to authenticated
  using (user_id = auth.uid() or es_admin(unidad_turno(turno_id)));

-- avisos: solo RRHH del país
drop policy if exists avisos_sel on ptg_eqx.avisos;
create policy avisos_sel on ptg_eqx.avisos for select to authenticated using (es_admin(unidad));
drop policy if exists avisos_upd on ptg_eqx.avisos;
create policy avisos_upd on ptg_eqx.avisos for update to authenticated using (es_admin(unidad)) with check (es_admin(unidad));

-- convocados: solo RRHH del país
drop policy if exists convocados_all on ptg_eqx.convocados;
create policy convocados_all on ptg_eqx.convocados for all to authenticated using (es_admin_pais(pais)) with check (es_admin_pais(pais));

-- ---------------------------------------------------------------------
-- Permisos explícitos (sin esto las tablas nuevas no responden)
-- ---------------------------------------------------------------------
grant usage on schema ptg_eqx to authenticated;
grant select, insert, update, delete on all tables in schema ptg_eqx to authenticated;
revoke all on all tables in schema ptg_eqx from anon;
revoke all on schema ptg_eqx from anon;
revoke all on ptg_eqx.pins, ptg_eqx.pin_intentos from authenticated;
grant execute on function ptg_eqx.reservar(uuid), ptg_eqx.permitido(), ptg_eqx.mi_email(),
  ptg_eqx.es_admin(text), ptg_eqx.es_admin_pais(text), ptg_eqx.es_regional(), ptg_eqx.unidad_tienda(uuid), ptg_eqx.unidad_turno(uuid),
  ptg_eqx.pin_estado(), ptg_eqx.set_pin(text,text), ptg_eqx.entrar_rrhh(text,text), ptg_eqx.salir_rrhh(text), ptg_eqx.confirmar_calendario(uuid) to authenticated;
revoke execute on function ptg_eqx.reservar(uuid), ptg_eqx.set_pin(text,text), ptg_eqx.entrar_rrhh(text,text),
  ptg_eqx.salir_rrhh(text), ptg_eqx.pin_estado(), ptg_eqx.confirmar_calendario(uuid) from anon, public;

-- ---------------------------------------------------------------------
-- Tiempo real: la app se actualiza sola cuando alguien reserva
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['tiendas','turnos','reservas','avisos','config'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'ptg_eqx' and tablename = t) then
      execute format('alter publication supabase_realtime add table ptg_eqx.%I', t);
    end if;
  end loop;
end $$;

-- RRHH regional de Equinox (entra sin PIN, crea los PIN de cada país y agrega el dominio de correo)
insert into ptg_eqx.admins (email, pais)
values ('climamarathon@gmail.com', '*')
on conflict (email, pais) do update set hasta = null;
