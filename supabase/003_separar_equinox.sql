-- =====================================================================
-- Ejecutar UNA vez en SOP_Marathon (donde ya existe el schema ptg de Marathon).
-- 1) Saca a Equinox de Marathon (Equinox tendrá su propio schema ptg_eqx).
-- 2) Endurece el acceso: solo entran correos de los dominios configurados
--    (y RRHH regional), y nadie ve empresas ni dominios ajenos.
-- Seguro: hoy no hay tiendas, perfiles ni configuración cargados.
-- =====================================================================
delete from ptg.config   where unidad like 'EQX-%';
update ptg.perfiles set unidad = null where unidad like 'EQX-%';
delete from ptg.unidades where empresa = 'Equinox';

create or replace function ptg.permitido() returns boolean
language sql stable security definer set search_path = ptg as $$
  select auth.uid() is not null and (
       exists (select 1 from dominios d where mi_email() like '%@' || d.dominio)
    or exists (select 1 from admins where email = mi_email() and (hasta is null or hasta > now()))
  )
$$;

drop policy if exists unidades_sel on ptg.unidades;
create policy unidades_sel on ptg.unidades for select to authenticated using (ptg.permitido());
drop policy if exists dominios_sel on ptg.dominios;
create policy dominios_sel on ptg.dominios for select to authenticated using (ptg.es_regional());
