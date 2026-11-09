-- Ejecutar UNA vez, después de 001_init.sql.
-- Este correo entra como RRHH regional (sin PIN) y desde la app
-- (Panel RRHH → Acceso y PIN) crea el PIN de cada país.

insert into ptg.admins (email, pais)
values (lower('climamarathon@gmail.com'), '*')
on conflict (email, pais) do update set hasta = null;

-- Opcional: solo dejar entrar correos de Marathon/Equinox. Un dominio por línea.
-- insert into ptg.dominios (dominio) values ('marathon.com.ec'), ('marathon.pe');
