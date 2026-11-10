# Play the Game

Turnos de apoyo en tienda para el personal administrativo.

**Dos apps separadas con el mismo código:** Marathon (azul, schema `ptg`) y Equinox
(negro y naranja, schema `ptg_eqx`). Cada una tiene su link, sus datos, sus PIN y sus
dominios de correo; ninguna ve nombres, tiendas ni personas de la otra. Cada colaborador elige
día, tienda y horario. RRHH de cada país gestiona tiendas, turnos, avisos y asistencia.

**Stack:** Vite (JavaScript) + Supabase (base de datos, tiempo real) + Vercel.

---

## 1. Supabase (una sola vez)

1. Proyecto: **SOP_Marathon** (cuenta de Supabase de Marathon). Play the Game vive en su
   propio schema `ptg`, separado de las tablas de SOP.
2. **SQL Editor → New query**: ejecuta `supabase/migrations/001_init.sql` (Marathon) y
   `supabase/equinox/001_init_equinox.sql` (Equinox). Si Marathon ya estaba creado con la
   versión anterior, ejecuta además `supabase/003_separar_equinox.sql`.
   Luego **Integrations → Data API → Exposed schemas**: agrega `ptg` y `ptg_eqx` y guarda
   (sin esto la app no ve las tablas).
3. Ejecuta `supabase/004_sin_login.sql` y `supabase/equinox/004_sin_login_equinox.sql`
   (la app ya no pide iniciar sesión).
4. **Authentication → Sign In / Providers → Allow anonymous sign-ins**: actívalo.
5. **Authentication → Rate Limits → anonymous sign-ins**: súbelo a 1000 por hora (en la
   oficina todos salen por la misma IP).
6. **Project Settings → API**: copia `Project URL` y la clave `anon public`.

### Sin login

El colaborador abre el link y entra directo. Escribe nombre, área y correo solo al
reservar (quedan guardados en su navegador). RRHH entra con **Acceso RRHH** + PIN del país,
o con el **PIN regional** (todos los países). El PIN regional se crea una vez por SQL y no
se guarda en este repositorio.

## 2. Vercel: dos proyectos desde el mismo repositorio

Crea **dos proyectos** en Vercel importando el mismo repo `play-the-game` (Add New → Project,
framework **Vite**). Cada uno con estas variables:

| Variable | Marathon | Equinox |
|---|---|---|
| `VITE_SUPABASE_URL` | Project URL | Project URL |
| `VITE_SUPABASE_ANON_KEY` | clave anon | clave anon |
| `VITE_MARCA` | `marathon` | `equinox` |

`VITE_MARCA` define colores, textos y el schema (`ptg` o `ptg_eqx`). Cada `git push`
actualiza las dos apps.

## 3. Primer uso (en cada app: Marathon y Equinox)

1. Abre la app → **Acceso RRHH** → **Con PIN regional** → escribe el PIN regional.
2. **Acceso y PIN → PIN por país**: crea el PIN de cada país (4 a 6 números) y compártelo por
   privado con RRHH de ese país. Desde ahí también puedes cambiar el PIN regional.
3. Opcional: **Correos que pueden entrar** limita los correos aceptados al reservar a los
   dominios de la empresa. Sin dominios, se acepta cualquier correo válido.
4. RRHH de cada país entra, pulsa **Acceso RRHH**, elige su país y escribe el PIN. Queda
   activo 12 horas. Tras 5 intentos fallidos se bloquea 15 minutos.
5. Cada RRHH carga sus tiendas (con correo de tienda), turnos y personal convocado.
6. Comparte el link de cada app con el personal administrativo de esa empresa.

## Desarrollo local

```bash
cp .env.example .env   # y llena las dos variables
npm install
npm run dev            # http://localhost:5173
npm run build          # verifica antes de hacer push
```

## Empresas y países

Viven en la tabla `ptg.unidades` (hoy: Marathon EC, PE, CL, BO y Equinox EC, PE, CL).
Para agregar una, inserta una fila; la app la muestra sola en la pantalla de inicio, en el
panel de RRHH y en los PIN:

```sql
insert into ptg.unidades (codigo, empresa, pais, orden) values ('EQX-BO','Equinox','BO',8);
```

## Cómo funciona por dentro

- **Reservas**: solo se crean con la función `reservar()` de la base de datos, que bloquea
  el turno mientras cuenta cupos. Dos personas no pueden tomar el mismo cupo, y nadie
  puede reservar dos turnos que se crucen.
- **PIN por país**: el PIN se guarda con hash en la tabla `pins`, que la app no puede leer.
  La función `entrar_rrhh()` lo valida y habilita ese dispositivo como RRHH del país por 12 horas
  (tabla `admins`; PIN `*` = regional). Las políticas RLS impiden que RRHH de un
  país vea o cambie otro. Cambiar un PIN cierra los accesos abiertos de ese país.
- **Avisos a tiendas**: cancelaciones, personas retiradas, cambios de horario y turnos
  eliminados se registran solos (triggers) y aparecen en Correos a tiendas.
- **Agregar a Outlook**: al reservar, el turno queda confirmado y aparece una ventana para
  agregarlo a Outlook (la tienda va como invitada), con el recordatorio de pulsar Enviar. Si
  no lo hace, "Mis turnos" lo marca como pendiente y la ventana vuelve a aparecer al entrar;
  RRHH ve "Sin Outlook" junto a esa persona. No requiere permisos de TI.
- **Plan gratis de Supabase**: el proyecto se pausa tras unos 7 días sin uso. Se reactiva
  desde el panel sin perder datos.
