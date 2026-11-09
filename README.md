# Play the Game · Marathon

Turnos de apoyo en tienda para el personal administrativo. Cada colaborador elige
día, tienda y horario. RRHH de cada país gestiona tiendas, turnos, avisos y asistencia.

**Stack:** Vite (JavaScript) + Supabase (base de datos, login, tiempo real) + Vercel.

---

## 1. Supabase (una sola vez)

1. Proyecto: **SOP_Marathon** (cuenta de Supabase de Marathon). Play the Game vive en su
   propio schema `ptg`, separado de las tablas de SOP.
2. **SQL Editor → New query**: pega y ejecuta todo `supabase/migrations/001_init.sql`.
   Luego **Project Settings → API → Exposed schemas**: agrega `ptg` y guarda
   (sin esto la app no ve las tablas).
3. Abre `supabase/002_admin_inicial.sql`, cambia `climamarathon@gmail.com` por tu correo
   de Marathon y ejecútalo. Con ese correo entras como **RRHH regional**.
4. **Project Settings → API**: copia `Project URL` y la clave `anon public`.

### Correos de inicio de sesión (obligatorio)

El correo que trae Supabase por defecto **solo envía a los miembros del proyecto**.
Para que le llegue el enlace a cualquier colaborador, usa el Gmail del área:

1. En la cuenta climamarathon@gmail.com activa la **verificación en dos pasos**.
2. Crea una **contraseña de aplicación**: Cuenta de Google → Seguridad → Contraseñas de aplicaciones.
3. En Supabase: **Authentication → Emails → SMTP Settings → Enable custom SMTP**:
   - Sender email: `climamarathon@gmail.com`
   - Sender name: `Play the Game`
   - Host: `smtp.gmail.com` · Port: `465`
   - Username: `climamarathon@gmail.com` · Password: la contraseña de aplicación
4. **Authentication → Rate Limits**: sube "emails per hour" a 100 para el día de lanzamiento.
   Gmail permite alrededor de 500 correos al día; cada persona recibe uno solo al entrar
   la primera vez en cada dispositivo.
5. **Authentication → Emails → Templates → Magic Link**: cambia el asunto a
   `Tu enlace para entrar a Play the Game` y el cuerpo a:
   ```html
   <h2>Play the Game · Marathon</h2>
   <p>Haz clic para entrar y elegir tu turno de apoyo en tienda:</p>
   <p><a href="{{ .ConfirmationURL }}">Entrar a Play the Game</a></p>
   <p>Si no pediste este enlace, ignora este correo.</p>
   ```

## 2. Vercel

1. **Add New → Project** → importa el repositorio `play-the-game` de GitHub.
2. Framework: **Vite** (lo detecta solo). Build: `npm run build`. Output: `dist`.
3. **Environment Variables**:
   - `VITE_SUPABASE_URL` = Project URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = clave anon public
4. Deploy. Copia la URL final (por ejemplo `https://play-the-game.vercel.app`).
5. De vuelta en Supabase → **Authentication → URL Configuration**:
   - **No cambies el Site URL** (lo usa la app SOP del mismo proyecto).
   - Redirect URLs: agrega la URL de Vercel y `http://localhost:5173` (para pruebas locales)

## 3. Primer uso

1. Entra con tu correo de Marathon → Panel RRHH → **Toda la región** (sin PIN).
2. **Acceso y PIN**: crea el PIN de cada país (4 a 6 números) y compártelo por privado con
   RRHH de ese país. Cada PIN da acceso a Marathon y Equinox de ese país. Opcional: agrega los dominios de Marathon para que solo
   entren correos corporativos.
3. RRHH de cada país entra a la app, pulsa **Acceso RRHH**, elige su país y escribe el PIN.
   Queda activo 12 horas; después lo vuelve a pedir. Tras 5 intentos fallidos se bloquea
   15 minutos.
4. Cada RRHH de país carga sus tiendas (con correo de tienda), turnos y su lista de
   personal convocado.
5. Comparte la URL de Vercel con el personal administrativo.

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
  La función `entrar_rrhh()` lo valida y habilita ese correo como RRHH del país por 12 horas
  (tabla `admins`, `*` = regional permanente). Las políticas RLS impiden que RRHH de un
  país vea o cambie otro. Cambiar un PIN cierra los accesos abiertos de ese país.
- **Avisos a tiendas**: cancelaciones, personas retiradas, cambios de horario y turnos
  eliminados se registran solos (triggers) y aparecen en Correos a tiendas.
- **Agregar a Outlook**: al reservar, el turno queda confirmado y aparece una ventana para
  agregarlo a Outlook (la tienda va como invitada), con el recordatorio de pulsar Enviar. Si
  no lo hace, "Mis turnos" lo marca como pendiente y la ventana vuelve a aparecer al entrar;
  RRHH ve "Sin Outlook" junto a esa persona. No requiere permisos de TI.
- **Plan gratis de Supabase**: el proyecto se pausa tras unos 7 días sin uso. Se reactiva
  desde el panel sin perder datos.
