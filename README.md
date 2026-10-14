# EFP N°30 · Administración

Aplicación administrativa independiente para la Escuela de Formación Profesional N°30. Stack: React, TypeScript y Vite.

## Estado

La API y sus fixtures compartidos se importaron desde el SHA 86682e93ab108f2484a75aa73f4888ecc72555b7. El origen, hash y el estado por hito están en docs/STATUS.md. El mock sólo se usa en desarrollo cuando VITE_ADMIN_DATA_MODE=mock; sus datos ficticios viven en memoria y se restablecen al reiniciar.

El cliente usa la ruta relativa fija /api/v1 en el mismo host; no requiere una URL de API pública configurable. No define endpoints ni el mecanismo de CSRF: esas decisiones deben salir del OpenAPI oficial. El backend es responsable de validar ADMIN y EDITOR.

Ver docs/STATUS.md para el estado por hito, el SHA del contrato y lo simulado frente a lo real.

## Desarrollo

Requiere Node.js 22 o posterior.

~~~sh
npm ci
npm run dev
~~~

Abrir http://localhost:5173. Con .env.local en modo mock y npm run mock:api ejecutándose en otra terminal, la app usa el mock compartido de efp30-api; las escrituras son ficticias y sólo viven en memoria.

En otra terminal, iniciar el servidor mock compartido con npm run mock:api. Copiar .env.example a .env.local para que Vite enrute /api/v1 al mock. El modo real llama a la API detrás del gateway en el mismo host.

Para compilar:

~~~sh
npm run build
~~~

VITE_ADMIN_DATA_MODE acepta mock o real. Las variables VITE_* son públicas y nunca deben contener credenciales.

En desarrollo, VITE_API_PROXY_TARGET puede apuntar a un backend local para que Vite enrute /api/v1. En producción, el gateway Nginx del despliegue conjunto recibe el mismo host y enruta /api/v1 al backend.

## Docker

~~~sh
docker build -t efp30-administracion-web .
docker run --rm -p 8080:8080 efp30-administracion-web
~~~

La imagen es multietapa; Nginx sirve estáticos como UID 10001 en el puerto 8080. El gateway de efp30-infra debe enrutar /api/v1 al backend y el resto al contenedor web. No se incluyen secretos ni configuración de túnel en esta imagen.

## Alcance excluido

El campus queda fuera de esta aplicación: no incluye comisiones, matrículas, gestión de alumnos o docentes, aulas, actividades, entregas ni calificaciones.
