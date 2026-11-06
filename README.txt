5PACE — DAZED REDESIGN + SUPABASE
=================================

Esta carpeta contiene la versión del rediseño DAZED conectada al proyecto
Supabase de 5PACE.

CONFIGURACIÓN INCLUIDA
- Supabase URL y publishable key del proyecto ya configuradas.
- Heyzine conectado a la edición:
  https://heyzine.com/flip-book/5912be048a
- Activity Board obtiene actividades desde public.activities en Supabase.
- El acceso al directorio requiere iniciar sesión. La autorización de lectura
  la aplican las políticas RLS configuradas en Supabase.
- La consola de administración aparece únicamente si Supabase confirma
  que el usuario tiene el rol de administrador.

ANTES DE PUBLICAR
1. Comprueba que la migración de acceso al Activity Board ya fue ejecutada
   en Supabase (según el trabajo realizado, ya se ejecutó).
2. Usa cuentas de prueba: una cuenta aprobada, una no aprobada y una admin.
3. No coloques service_role keys ni secretos en archivos del navegador.
4. No publiques enlaces privados de actividades en archivos JSON públicos.
   Las actividades deben administrarse desde Supabase.
5. Los enlaces individuales de actividades pueden actualizarse luego desde
   la consola administrativa.

ARCHIVOS
- index.html / styles.css / app.js: sitio DAZED
- supabase-config.js: configuración pública del proyecto Supabase
- heyzine-config.js: URL pública de la revista
- assets/: imágenes originales del diseño

Nota: esta carpeta es una build para revisión. No se ha desplegado ni fusionado
a main. La integración debe probarse en el entorno de publicación antes de
considerarse lista para producción.
