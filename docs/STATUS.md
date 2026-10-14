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

**Implementado hasta ahora:** navegación y estructura visual del módulo.

**Real:** sin formularios conectados ni registros reales.

**Mock:** aún no integrado en la interfaz.

**Pendiente:** editor, borrador, actualización con versión, publicar, comprobar ruta pública y archivar; presentar validación/conflicto desde el backend.

## D3 · Cursos, galería, calendario e institución

**Implementado hasta ahora:** estructura visual; modelos de curso/foto; preview aislada que filtra por selección, foto pública y curso publicado. La portada independiente de la tarjeta está representada como requisito de UI.

**Real:** aún no hay operaciones conectadas.

**Mock:** tests compartidos verifican retiro de carrusel al deshabilitar foto o archivar curso; la interfaz todavía no integra esos recursos.

**Pendiente:** formularios y operaciones de familias, cursos, fotos, eventos, medios e institución; vista previa combinada desde endpoint público; verificación real. Institución requiere rol ADMIN y confirmación también de servidor.

## D4 · Usuarios administrativos

**Implementado hasta ahora:** estructura visual, roles y restricción de navegación ADMIN.

**Real/mock:** sin operaciones conectadas.

**Pendiente:** listado, alta, cambio de rol/estado y restablecimiento de clave en API; permisos backend. No se enviarán emails.

## D5 · Integración real e imagen Docker

**Implementado hasta ahora:** `Dockerfile` multietapa y configuración Nginx prevista para estáticos, UID/GID 10001 y puerto 8080; proxy de desarrollo opcional para `/api/v1`.

**Verificación real:** `npm run build` sí está comprobado. Docker no pudo ejecutarse porque el CLI no está instalado; no se ha construido ni arrancado la imagen.

**Pendiente:** completar los recursos reales, construir y probar la imagen, conectar entorno local autorizado y verificar institucionalmente los dos flujos requeridos. No se modificaron repositorios relacionados ni hubo despliegue.

### Flujos reales pendientes

1. Crear borrador → publicar → comprobarlo en institucional → archivar.
2. Subir foto → asociar y habilitarla en portada → comprobarla en carrusel → deshabilitarla y comprobar retiro.

Las pruebas del servidor mock no cuentan como verificación de estos flujos en API real ni en institucional.
