# 5PACE Activity Board

Sitio editorial de 5PACE con un Activity Board conectado a Supabase. La web estática puede publicarse con GitHub Pages; los registros de actividades ya no se sirven desde archivos públicos.

## Estructura

- `index.html`: Magazine, Activity Board, inicio de sesión y consola administrativa.
- `js/app.js`: autenticación Supabase, consulta protegida y operaciones de administración.
- `js/activity.js`: redirección de compatibilidad para enlaces antiguos a fichas individuales.
- `css/style.css`: identidad visual y diseño responsive.
- `supabase/migrations/`: SQL necesario para permisos y función RPC de administrador.
- `assets/`: recursos visuales.

## Configuración inicial de Supabase

1. Abre el proyecto Supabase asociado a 5PACE.
2. En SQL Editor, ejecuta el archivo `supabase/migrations/202611020001_activity_board_access.sql`.
3. Confirma que tu usuario esté registrado en `private.admin_users`.
4. En Authentication, crea o confirma tu usuario de acceso con email y contraseña.
5. Comprueba que el proyecto esté activo y que las credenciales públicas del proyecto coincidan con las declaradas en `js/app.js`.

La clave publishable incluida en el frontend es pública por diseño. Nunca incluyas una `service_role` key ni secretos de Supabase en el repositorio.

## Acceso

- Visitantes sin sesión: no pueden consultar las actividades.
- Miembros aprobados: pueden leer actividades con estado `published` o `archived`.
- Administradores: pueden leer todos los estados y crear, editar, publicar, archivar o eliminar actividades.

La autorización real depende de Row Level Security (RLS) en Supabase. Ocultar controles en la interfaz no sustituye las políticas de base de datos.

## Administrar actividades

1. Entra a la página y pulsa **MEMBER LOGIN**.
2. Inicia sesión con la cuenta administradora.
3. La consola **ADMIN CONSOLE** aparecerá automáticamente si la cuenta figura en `private.admin_users`.
4. Para crear una actividad, completa título, categoría y enlace de Facebook.
5. Guarda como borrador o selecciona `published` / `archived` antes de guardar.
6. Usa **EDIT** en una tarjeta para modificarla y **DELETE** para eliminarla.

Los enlaces de Facebook deben usar HTTPS. Las actividades en borrador no son visibles para miembros aprobados.

## Modelo de datos

La tabla `public.activities` utiliza los campos existentes:
- `title`, `slug`, `category`, `status`
- `content` JSONB, con `facebook_url`
- `created_at`, `updated_at`

Estados permitidos: `draft`, `published`, `archived`.

## Publicación

La rama de trabajo es `feat/5pace-foundation`. No se ha fusionado con `main`. Revisa los cambios y prueba los tres perfiles antes de fusionar o publicar esta versión.

## Verificación pendiente

Después de ejecutar la migración en Supabase, prueba:
1. Visitante sin iniciar sesión: no debe obtener actividades.
2. Cuenta autenticada sin aprobación: no debe obtener actividades.
3. Miembro aprobado: solo debe ver `published` y `archived`.
4. Administrador: debe ver borradores y poder crear, editar, publicar, archivar y eliminar.

GitHub Pages publica los archivos estáticos; no debe contener registros, enlaces internos ni información privada de actividades.
