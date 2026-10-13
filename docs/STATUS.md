# Estado de hitos · Administración EFP N°30

Fecha de preparación: 2026-10-13.

## Fuente del contrato y fixtures

- Repositorio fuente esperado: efp30-api.
- Disponibilidad local al iniciar: no encontrado junto al proyecto.
- Búsqueda pública por nombre: sin resultado identificable.
- SHA OpenAPI: **pendiente; no se pudo leer el repositorio fuente**.
- Fixtures compartidos: **pendientes; src/mocks/shared/ está vacío salvo instrucciones**.
- No se ha copiado, inferido ni modificado ningún contrato.
- No se han modificado los repositorios efp30-web, efp30-api, efp30-institucional-web ni efp30-infra.

Cuando se habilite efp30-api, registrar aquí el SHA exacto del commit cuya especificación y fixtures se importen. Distinguir el SHA del OpenAPI si el archivo tiene un hash propio.

## D1 · Proyecto, layout, cliente y autenticación

**D1 · Base preparada:** aplicación React + TypeScript + Vite independiente; configuración, lockfile propio de npm generado, Dockerfile multietapa, Nginx sin root en 8080, layout adaptable, vista previa navegable, pantalla de login, tipos ADMIN/EDITOR, transporte same-origin /api/v1 y traducción común de 401, 403, validación, 409, errores de upload y red.

**Real:** únicamente la interfaz de vista previa local. Aún no existe integración con servidor.

**Simulado:** ninguno. El modo de desarrollo no simula sesiones ni escrituras; presenta una vista de estructura vacía.

**Comandos y resultados:** npm ci --offline --no-audit --no-fund (0); npm run build (0, TypeScript y Vite; 35 módulos).

**Pendiente para cerrar integración D1:** restauración de sesión, login, logout y CSRF conforme a OpenAPI; importar mocks compartidos; validar roles contra backend; habilitar adaptador.

## D2 · Noticias

Pendiente. No se declaran rutas, campos ni operaciones sin el contrato oficial.

## D3 · Cursos, galería, calendario e institución

Pendiente. Incluir selección múltiple y orden de fotos públicas del carrusel, vista previa combinada y portada separada por curso. La API debe limitar el carrusel a fotos públicas de cursos publicados.

## D4 · Usuarios administrativos

Pendiente. El alta, la edición, los roles y los permisos ADMIN deben ajustarse al contrato y verificarse en backend.

## D5 · Integración real e imagen Docker

La estructura Docker está preparada; la integración real y la verificación de extremo a extremo siguen pendientes.

Flujos que requieren API disponible y autorización de entorno:

1. Crear borrador → publicar → verificar institucional → archivar.
2. Subir foto de curso → habilitar portada → verificar carrusel institucional → deshabilitar → verificar retiro.

No se hicieron llamadas de escritura, envíos de correo ni despliegues.
