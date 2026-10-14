# Estado de hitos · Administración EFP N°30

Fecha de preparación: 2026-10-13.

## Fuente del contrato y fixtures

- Repositorio fuente: efp30-api, checkout local limpio en HEAD 6b21a6bcb5d5243d38f674b72cb6e4e1cff7f960.
- Commit fuente de la revisión OpenAPI v1 copiada: **86682e93ab108f2484a75aa73f4888ecc72555b7**.
- SHA-256 de contracts/openapi-v1.yaml: **A581A005883AC7F3E150D2685AF1F2064BB09EF570766663424CEEC13BD9FF53**.
- Copiados sin modificar desde ese checkout: fixtures/editorial.json y mocks/server.mjs, server.test.mjs y README.md.
- El fixture contiene identidades y contenido ficticios; el mock no persiste estado y sólo se usa con VITE_ADMIN_DATA_MODE=mock.
- Los contratos no se modifican desde el frontend. Las rutas, cuerpos y restricciones de la app se toman del OpenAPI copiado.

No se modificaron efp30-api, efp30-web, efp30-institucional-web ni efp30-infra.
## D1 · Proyecto, layout, cliente y autenticación

**Preparado:** app independiente React + TypeScript + Vite, package.json y lockfile propios, pantalla de acceso, vista previa navegable, tipos ADMIN/EDITOR, transporte same-origin bajo /api/v1, gestión común de 401, 403, validación, 409, errores de upload y red. Dockerfile multietapa y Nginx no-root en puerto 8080.

**Real:** interfaz local compilada. No hay integración con servidor.

**Simulado:** ninguno; la vista previa no muestra una sesión ni datos de ejemplo y bloquea escrituras.

**Comandos y resultados:** npm ci --offline --no-audit --no-fund (0); npm run build (0, TypeScript y Vite).

**Pendiente para cerrar D1:** restauración de sesión, login, logout y CSRF desde el contrato; importar mocks compartidos; conectar adaptador y validación de roles en backend.

## D2 · Noticias

**Preparado:** estructura del espacio editorial, estados, filtros y flujo visual borrador → publicado → archivado. Controles desactivados hasta integrar la API.

**Real:** no hay registros ni conexión al sitio institucional.

**Simulado:** ninguno; no se confirman guardados, publicaciones ni archivos.

**Comando y resultado:** npm run build (0, TypeScript y Vite).

**Pendiente:** editor de contenido, validaciones, concurrencia y operaciones ajustadas al OpenAPI.

## D3 · Cursos, galería, calendario e institución

**Preparado:** páginas de cursos/familias, calendario, biblioteca de medios e institución/contacto. La galería modela texto alternativo, orden, selección para el carrusel y portada independiente. La vista previa combinada admite únicamente fotos públicas de cursos publicados y las ordena por posición.

**Real:** no hay API ni fotografías cargadas.

**Simulado:** ninguno; la selección está vacía y las subidas no se aceptan.

**Comando y resultado:** npm run build (0, TypeScript y Vite).

**Pendiente:** conectar recursos, reglas de validación de archivos, estados editoriales y permisos ADMIN desde el contrato oficial.

## D4 · Usuarios administrativos

**Preparado:** vista vacía, roles ADMIN/EDITOR y aviso de que el servidor autoriza cada cambio.

**Real:** ninguna cuenta cargada.

**Simulado:** ninguno; no se crean usuarios ni se envían invitaciones o correos.

**Comando y resultado:** npm run build (0, TypeScript y Vite).

**Pendiente:** integrar gestión de usuarios según OpenAPI y comprobar los permisos en backend.

## D5 · Integración real e imagen Docker

**Preparado:** Dockerfile multietapa, imagen Nginx oficial con versión 1.30.5-alpine3.24, ejecución como UID/GID 10001, puerto 8080, healthcheck /healthz y transporte same-origin /api/v1 para el gateway.

**Real:** build de frontend con npm run build (0, TypeScript y Vite).

**Simulado:** ninguno.

**Comandos y resultados:** docker --version no pudo ejecutarse porque Docker no está instalado; git ls-remote https://github.com/Maxigoge/efp30-api.git HEAD falló al resolver github.com. No fue posible construir/probar la imagen ni conectar el backend.

**Pendiente:** importar OpenAPI y fixtures; integrar autenticación, CSRF y operaciones; construir y ejecutar la imagen; verificar en la API real y en el institucional los flujos obligatorios.

Flujos pendientes:

1. Crear borrador → publicar → verificar institucional → archivar.
2. Subir foto a curso → habilitar en portada → verificar carrusel institucional → deshabilitar → verificar retiro.

No se ejecutaron escrituras externas, envíos de correo ni despliegues.
