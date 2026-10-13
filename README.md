# EFP N°30 · Administración

Aplicación administrativa independiente para la Escuela de Formación Profesional N°30. Stack: React, TypeScript y Vite.

## Estado

D1 deja preparado el proyecto, el layout adaptable, la pantalla de acceso, los tipos de roles y el transporte HTTP. La API y sus fixtures compartidos no estaban disponibles al crear esta base. Por eso la vista previa no abre una sesión, no presenta contenido de ejemplo y no confirma escrituras. El modo mock está explícito y bloqueado hasta importar los mocks de efp30-api.

El cliente usa llamadas relativas al mismo host bajo /api/v1. No define endpoints ni el mecanismo de CSRF: esas decisiones deben salir del OpenAPI oficial. El backend es responsable de validar ADMIN y EDITOR.

Ver docs/STATUS.md para el estado por hito, el SHA del contrato y lo simulado frente a lo real.

## Desarrollo

Requiere Node.js 22 o posterior.

~~~sh
npm ci
npm run dev
~~~

Abrir http://localhost:5173. La vista previa permite recorrer las secciones del panel; el acceso y los controles de escritura están deshabilitados mientras falten API, contrato y fixtures.

Para compilar:

~~~sh
npm run build
~~~

VITE_ADMIN_DATA_MODE acepta mock o real. El valor del ejemplo es mock; sin fixtures compartidos no ejecuta operaciones. Las variables VITE_* son públicas y nunca deben contener credenciales.

En desarrollo, VITE_API_PROXY_TARGET puede apuntar a un backend local para que Vite enrute /api/v1. En producción, el gateway Nginx del despliegue conjunto recibe el mismo host y enruta /api/v1 al backend.

## Docker

~~~sh
docker build -t efp30-administracion-web .
docker run --rm -p 8080:8080 efp30-administracion-web
~~~

La imagen es multietapa; Nginx sirve estáticos como UID 10001 en el puerto 8080. El gateway de efp30-infra debe enrutar /api/v1 al backend y el resto al contenedor web. No se incluyen secretos ni configuración de túnel en esta imagen.

## Alcance excluido

El campus queda fuera de esta aplicación: no incluye comisiones, matrículas, gestión de alumnos o docentes, aulas, actividades, entregas ni calificaciones.
