# EFP N°30 · Administración

Aplicación administrativa independiente para la Escuela de Formación Profesional N°30. Stack: React, TypeScript y Vite.

El contrato oficial OpenAPI v1, sus fixtures y mocks compartidos se copiaron de `efp30-api`; commit y SHA-256 exactos constan en [docs/STATUS.md](docs/STATUS.md). La app consume exclusivamente `/api/v1` en el mismo host. No define endpoints ni modifica el contrato.

## Desarrollo

Requiere Node.js 22 o posterior.

~~~sh
npm ci
npm run dev
~~~

Abrir http://localhost:5173. Para usar el mock compartido en otra terminal, ejecutar `npm run mock:api` y copiar `.env.example` a `.env.local`. El mock debe habilitarse explícitamente con `VITE_ADMIN_DATA_MODE=mock`; sus cuentas y datos son ficticios, sólo permanecen en memoria y no se envían emails. El modo `real` es el predeterminado y enruta `/api/v1` al gateway/backend local configurado.

`VITE_API_PROXY_TARGET` sólo configura el destino de proxy durante desarrollo. Variables `VITE_*` son públicas; no incluir secretos o credenciales.

## Verificación

~~~sh
npm run build
npm run test:contract-mock
~~~

Las pruebas del mock comprueban el contrato simulado; no sustituyen comprobaciones contra API real. Estado por hito y pendientes: [docs/STATUS.md](docs/STATUS.md).

## Docker

~~~sh
docker build -t efp30-administracion-web .
docker run --rm -p 8080:8080 efp30-administracion-web
~~~

La imagen sirve los estáticos como UID 10001 en el puerto 8080. En el despliegue conjunto, el gateway enruta `/api/v1` al backend y el resto al contenedor web. La imagen no incluye secretos ni configuración Cloudflare.

## Alcance excluido

El campus queda fuera: no incluye comisiones, matrículas, gestión de alumnos/docentes, aulas, actividades, entregas ni calificaciones.
