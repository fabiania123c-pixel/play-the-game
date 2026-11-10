-- =====================================================================
-- 004 · Sin login. Cada navegador entra con una sesión anónima de Supabase
-- (invisible para la persona). El correo se pide solo al reservar.
-- RRHH entra con PIN de país o con el PIN regional ('*').
-- Requiere: Authentication → Sign In / Providers → Allow anonymous sign-ins = ON
-- =====================================================================

-- Identidad: el correo si existe; si no, la sesión anónima
create or replace function ptg_eqx.mi_email() returns text
language sql stable set search_path = '' as $$
  select lower(coalesce(nullif(auth.jwt()->>'email',''), 'anon:' || coalesce(auth.uid()::text,'')))
$$;

-- Cualquier sesión (anónima incluida) puede usar la app de su link
create or replace function ptg_eqx.permitido() returns boolean
language sql stable security definer set search_path = ptg_eqx as $$
  select auth.uid() is not null
$$;

-- PIN regional ('*') además de los países
alter table ptg_eqx.pins drop constraint if exists pins_pais_check;
alter table ptg_eqx.pins add constraint pins_pais_check check (pais in ('*','EC','PE','CL','BO','CO'));

create or replace function ptg_eqx.set_pin(p_pais text, p_pin text) returns void
language plpgsql security definer set search_path = ptg_eqx as $$
declare v_salt text := md5(random()::text || clock_timestamp()::text);
begin
  if not es_regional() then raise exception 'NO_REGIONAL'; end if;
  if p_pais <> '*' and not exists (select 1 from unidades where pais = p_pais) then raise exception 'PAIS_INVALIDO'; end if;
  if p_pin !~ '^[0-9]{4,6}$' then raise exception 'PIN_INVALIDO'; end if;
  insert into pins (pais, salt, hash, actualizado) values (p_pais, v_salt, pin_hash(v_salt, p_pin), now())
  on conflict (pais) do update set salt = excluded.salt, hash = excluded.hash, actualizado = now();
  delete from admins where pais = p_pais and hasta is not null and email <> mi_email();
end $$;

-- Perfil: ya no se compara con el correo de la sesión
drop policy if exists perfiles_ins on ptg_eqx.perfiles;
create policy perfiles_ins on ptg_eqx.perfiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists perfiles_upd on ptg_eqx.perfiles;
create policy perfiles_upd on ptg_eqx.perfiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Reservar con nombre, área y correo escritos por la persona
drop function if exists ptg_eqx.reservar(uuid);
create or replace function ptg_eqx.reservar(p_turno uuid, p_nombre text, p_area text, p_email text) returns uuid
language plpgsql security definer set search_path = ptg_eqx as $$
declare
  t        turnos%rowtype;
  v_unidad text;
  c        config%rowtype;
  n        int;
  v_id     uuid;
  v_email  text := lower(trim(coalesce(p_email,'')));
begin
  if auth.uid() is null then raise exception 'NO_AUTH'; end if;
  if trim(coalesce(p_nombre,'')) = '' or trim(coalesce(p_area,'')) = '' then raise exception 'SIN_PERFIL'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'EMAIL_INVALIDO'; end if;
  if exists (select 1 from dominios) and not exists (select 1 from dominios d where v_email like '%@' || d.dominio) then
    raise exception 'DOMINIO';
  end if;

  select * into t from turnos where id = p_turno for update;
  if not found then raise exception 'NO_TURNO'; end if;
  if t.fecha < current_date then raise exception 'PASADO'; end if;
  select unidad into v_unidad from tiendas where id = t.tienda_id;

  insert into perfiles (user_id, email, nombre, area) values (auth.uid(), v_email, trim(p_nombre), trim(p_area))
  on conflict (user_id) do update set email = excluded.email, nombre = excluded.nombre, area = excluded.area, actualizado = now();

  select * into c from config where unidad = v_unidad;
  if not found then select * into c from config where unidad = 'temporada'; end if;
  if coalesce(c.abiertas, true) = false then raise exception 'CERRADAS'; end if;

  if exists (select 1 from reservas where turno_id = p_turno and user_id = auth.uid()) then raise exception 'YA'; end if;
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
  values (p_turno, auth.uid(), v_email, trim(p_nombre), trim(p_area))
  returning id into v_id;
  return v_id;
end $$;
grant execute on function ptg_eqx.reservar(uuid, text, text, text) to authenticated;
revoke execute on function ptg_eqx.reservar(uuid, text, text, text) from anon, public;
