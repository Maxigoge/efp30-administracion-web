# Estado de hitos · Administración EFP N°30

Fecha de actualización: 2026-10-14.

## Fuente oficial del contrato

- Repositorio: `efp30-api`.
- Commit que contiene la revisión OpenAPI v1 copiada: **86682e93ab108f2484a75aa73f4888ecc72555b7**.
- SHA-256 de `contracts/openapi-v1.yaml`: **A581A005883AC7F3E150D2685AF1F2064BB09EF570766663424CEEC13BD9FF53**.
- El backend comunicó un commit de documentación posterior (`40b547cf76120f15c053b7efd3d4c9c25368badd`); OpenAPI no cambió.
- Contrato, fixtures, servidor mock y pruebas se importaron sin modificaciones. Las rutas y cuerpos de las solicitudes se derivan del contrato copiado.

## D1 · Proyecto, layout, cliente y autenticación

**Implementado:** aplicación React + TypeScript + Vite con `package.json` y lockfile propios; layout; cliente `/api/v1`; login, restauración de sesión, logout, cookie de servidor con `credentials: include`, CSRF por `GET /auth/csrf` y cabecera contractual `X-CSRF-TOKEN`; renovación consultando el token en cada escritura y reintento único ante `CSRF_INVALID`; tipos y visualización de roles ADMIN/EDITOR. No se guardan credenciales, sesión ni CSRF en almacenamiento del navegador. El frontend restringe navegación ADMIN y el servidor conserva la autoridad de permisos.

**Real:** contratos y fixtures copiados; `npm run build` compila el cliente real. El proceso API no está ejecutándose con base de datos aislada, por lo que login/sesión no se han comprobado contra un backend real.

**Mock:** fixture ficticio y servidor compartido de `efp30-api`; se activa explícitamente con `VITE_ADMIN_DATA_MODE=mock`. El mock no persiste información y no simula correo. `npm run test:contract-mock` pasa 8 pruebas de su contrato (las pruebas verifican el servidor mock, no la interfaz ni integración real).

**Comandos/resultados:** `npm ci --offline --no-audit --no-fund` (0, en el scaffold); `npm run build` (0); `npm run test:contract-mock` (8/8).

**Pendiente:** comprobar login/sesión/CSRF contra API en ejecución. Docker todavía no está disponible en este equipo.

## D2 · Noticias

**Implementado:** listado y filtro por estado/búsqueda; crear DRAFT; editar por UUID con `version`; publicar y archivar con control optimista; consulta posterior a `/public/noticias/{slug}` para mostrar visibilidad de la API pública. Valida campos del navegador, presenta `fieldErrors`, 401/403/409 y permite recargar explícitamente la versión actual en caso de conflicto. Slug queda inmutable al editar, según contrato.

**Real:** integración escrita contra las operaciones OpenAPI. No ejecutada contra backend real: falta proceso API/base de datos aislada. La comprobación del módulo consulta la ruta pública del API, no una instancia del sitio institucional.

**Mock:** el fixture/mock está disponible; con `VITE_ADMIN_DATA_MODE=mock` se usa el servidor compartido. Tests existentes prueban el servidor mock, no esta pantalla.

**Comandos/resultados:** `npm run build` (0); `npm run test:contract-mock` (8/8 pruebas de servidor mock).

**Pendiente:** comprobar el flujo en backend real y contrastar la ruta en efp30-institucional-web al cerrar D5.

## D3 · Cursos, galería, calendario e institución

**Implementado:** listado y edición versionada de cursos/familias, publicación y archivo de cursos; subida múltiple de imágenes a medios públicos (cliente limita JPEG/PNG/WebP a 5 MiB; el servidor sigue validando los bytes); galería completa con alt, orden, habilitación y selección `showOnHomepage`; portada de tarjeta separada, elegida visualmente por miniaturas dentro del editor del curso; los paneles Datos y Fotos conservan sus cambios locales al alternar, sin exponer UUID en la interfaz; el campo contractual `coverMediaId` se asigna al guardar; vista previa combinada que incluye las selecciones locales del curso sólo si está publicado y habilita imágenes públicas, más los otros cursos desde `/public/portada/carrusel`. Calendario editorial con intervalos ISO offset en `America/Argentina/Buenos_Aires` y fin exclusivo para eventos de día completo. Institución/contacto se muestra a ADMIN y escribe con versión; también prepara primera configuración con version=0 cuando GET responde el código contractual `INSTITUTION_NOT_CONFIGURED`. El backend también debe validar el permiso. Biblioteca admite imágenes y PDF con límites contractuales/compartidos; permite visibilidad, habilitación y descarga privada.

**Real:** clientes y formularios están conectados a rutas OpenAPI. El GET de readiness del backend local (http://localhost:8080/actuator/health/readiness) respondió 200 el 2026-10-14. No se ejecutaron escrituras de galería ni cambios en cursos de usuario.

**Mock:** tests compartidos prueban CSRF/roles, upload, calendario y retiro del carrusel (8/8). La interfaz usa `/api/v1` y modo mock explícito; esos resultados no equivalen a integración real.

**Comandos/resultados:** `npm run build` (0); `npm run test:contract-mock` (8/8); `git diff --check` (sin errores de whitespace; hay advertencias de conversión LF/CRLF de Git en Windows).

**Pendiente:** comprobar visualmente en la interfaz autorizada la alternancia de pestañas y el flujo de selección/guardado; después verificar upload, orden y retiro de foto con un curso de prueba, sin cambiar cursos existentes. La sesión de Firefox no quedó autorizada para control de interfaz, por lo que no se envió ninguna escritura real. También falta comprobar permisos ADMIN/EDITOR y uploads contra el servidor. Los requisitos de portada de tarjeta y carrusel permanecen separados.
## D4 · Usuarios administrativos

**Implementado:** listado, alta directa sin invitación, edición de nombre/roles/estado y restablecimiento de contraseña contra `/admin/users`. Todas las escrituras envían la `version`; en `409` se conserva el formulario y la recarga del registro vigente es explícita. Validación de roles, email y contraseña de 12–128 caracteres. La contraseña se transmite al servidor y se limpia al cerrar el formulario; no se guarda en localStorage/sessionStorage ni se envía correo. El menú oculta Usuarios a EDITOR y cada API debe exigir ADMIN.

**Real:** integración escrita contra el OpenAPI. No probada contra backend real; queda por comprobar que éste invalide sesiones, proteja el último ADMIN y responda 403/409 como el contrato.

**Mock:** el servidor compartido protege `/admin/users` y no envía email; los tests generales pasan 8/8. La UI usa rutas relativas del modo configurado y no se confirmó con navegador autenticado.

**Comandos/resultados:** `npm run build` (0); `npm run test:contract-mock` (8/8).

**Pendiente:** integración real y comprobación de roles ADMIN/EDITOR y del conflicto del último ADMIN.
## D5 · Integración real e imagen Docker

**Implementado:** imagen multietapa propia (`node:22-alpine` → `nginx:1.30.5-alpine3.24`); runtime con UID/GID 10001, puerto 8080, healthcheck `/healthz`, headers de seguridad, tamaño de request y build de estáticos. El contenedor no fabrica respuestas API: el Nginx gateway del despliegue conjunto enruta `/api/v1` en el mismo host. La etiqueta nginx está publicada como Docker Official Image en [Docker Hub](https://hub.docker.com/_/nginx/tags).

**Real:** build estático validado con Vite/TypeScript. No se ejecutaron workflows contra backend ni sitio institucional. En este equipo no están disponibles Docker ni Podman, así que no se pudo construir/arrancar la imagen ni validar Nginx en contenedor.

**Mock:** `npm run test:contract-mock` pasa 8/8; comprueba reglas compartidas de news, versiones, calendario, roles, CSRF, carga y retiro de carrusel. No comprueba montaje del contenedor ni la integración visual.

**Comandos/resultados:** `npm run build` (0); `npm run test:contract-mock` (8/8); `git diff --check` (0, sin errores); `Get-Command docker` y `Get-Command podman` no devolvieron runtime instalado; SHA de OpenAPI verificado con `certutil`.

**Pendiente:** construir y ejecutar con Docker; validar login y CSRF real; hacer los dos flujos obligatorios contra backend real y abrir el sitio institucional para comprobar visibilidad/retiro. No se alteraron repositorios relacionados, secretos ni despliegues.

### Flujos reales pendientes

1. Crear borrador → publicar → comprobarlo en institucional → archivar.
2. Subir foto → asociar y habilitarla en portada → comprobarla en carrusel → deshabilitarla y comprobar retiro.

Las pruebas del servidor mock no cuentan como verificación de estos flujos en API real ni en institucional.
