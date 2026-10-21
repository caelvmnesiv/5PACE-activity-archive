# 5PACE Activity Archive

Sitio estático para publicar el catálogo de actividades de 5PACE mediante GitHub Pages. Diseño Y2K/editorial, navegación en inglés y explicaciones en español.

## Archivos

- `index.html`: catálogo, buscador y filtros.
- `activity.html`: ficha individual, abierta mediante `activity.html?id=ACT-026`.
- `data/activities.json`: registros que mantiene la administración.
- `css/style.css`: identidad visual y diseño responsive.
- `js/app.js`: renderizado del catálogo, búsqueda, filtros y orden.
- `js/activity.js`: renderizado de la ficha individual.
- `assets/`: icono y espacio para portadas.

## Antes de publicarlo

Las tres actividades de `data/activities.json` son **fichas de demostración**. Incluyen texto marcado como `REEMPLAZAR` y no están listas para anunciarse a los participantes. Sustituye las instrucciones, fechas, recompensas y enlaces por información aprobada. Cambia `"demo": true` a `false` cuando la ficha esté revisada. Los enlaces de Facebook están vacíos de forma intencional.

## Editar una actividad

1. Abre `data/activities.json` en el repositorio.
2. Pulsa el lápiz para editar.
3. Cambia los valores dentro de la actividad correspondiente.
4. Conserva las comillas y comas del formato JSON. No dejes una coma después del último campo.
5. Pulsa **Commit changes**.
6. Espera a que GitHub Pages publique los cambios.

### Campos principales

- `id`: código único, no repetir.
- `title`: título visible.
- `cover_title`: título grande de la portada de la tarjeta; admite `\n` para salto de línea.
- `category`: por ejemplo `monthly`, `free-activity`, `collaboration`, `special-event`, `editorial`.
- `status`: `upcoming`, `open`, `closed`, `archived` o `draft`.
- `published`, `deadline`, `updated`: fechas `YYYY-MM-DD`; usa `null` si no hay fecha.
- `summary`, `overview`, `instructions`, `submission`, `notes`: texto de la ficha.
- `requirements_list`, `how_to_participate`: listas de puntos.
- `reward`: número o `null`. El diseño actual lo presenta como recompensa/unidades; ajusta el texto de la plantilla si tu sistema usa soles, puntos u otra unidad.
- `reservation_code`: texto o `null`.
- `facebook_url`: URL completa de la publicación, por ejemplo `https://www.facebook.com/...`.
- `cover_style`: `cover-mystery`, `cover-music` o `cover-free`.
- `tags`: lista de etiquetas.
- `demo`: `true` mientras la ficha sea solo un ejemplo.

## Publicar en GitHub Pages (gratis)

1. Inicia sesión en GitHub y crea un repositorio público llamado `5pace-activity-archive`.
2. Sube **el contenido de esta carpeta**, de modo que `index.html` quede en la raíz del repositorio (no dentro de una carpeta duplicada).
3. En el repositorio, abre **Settings → Pages**.
4. En **Build and deployment**, elige **Deploy from a branch**.
5. Selecciona la rama `main` y la carpeta `/(root)`, y pulsa **Save**.
6. Espera a que termine la publicación. GitHub mostrará la URL del sitio en la sección Pages.
7. Abre la URL, prueba el buscador, los filtros y una ficha individual desde el móvil.

La URL habitual es `https://TU-USUARIO.github.io/5pace-activity-archive/`. Usa la URL que GitHub Pages te muestre, por si la configuración de tu cuenta difiere.

## Importante

- GitHub Pages publica el contenido del sitio; el repositorio público también expone el JSON. No guardes datos personales, información privada, contraseñas ni notas internas.
- Esta versión no tiene inicio de sesión ni panel CMS. La administración actualiza los datos desde GitHub. Aunque solo administración tenga permiso de edición, cualquier persona puede leer el catálogo público.
- Los enlaces de Facebook deben ser públicos o accesibles para los participantes.
- Las fechas no cambian automáticamente el estado: administración debe actualizar `status` cuando abra o cierre una convocatoria.
- Las fuentes tipográficas se cargan desde Google Fonts cuando hay conexión. Si no cargan, se usan fuentes de respaldo.
- Para probar localmente, no abras `index.html` directamente como archivo: la carga del JSON con `fetch` puede fallar. Publícalo en GitHub Pages o usa un servidor local.

## Prueba local opcional

Si tienes Python instalado, abre una terminal en esta carpeta y ejecuta:

```bash
python -m http.server 8000
```

Luego abre `http://localhost:8000`. Detén el servidor con `Ctrl+C`.
