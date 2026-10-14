# MicheMango

Catálogo web para el emprendimiento MicheMango de Barranquilla. El sitio estático vive en `public/`; Express y su API se ejecutan desde `src/`. El catálogo, las solicitudes, el panel de administración y un asistente para elegir miches están conectados al backend.

## Estructura

```text
public/
  index.html
  admin/{login.html,panel.html}
  css/styles.css
  js/{config.js,menu.js,animaciones.js,catalogo.js,contacto.js,chatbot.js}
  js/admin/{login.js,panel.js}
src/
  server.js
  productos.js
  routes/{admin.js,adminAuth.js,adminApi.js,contacto.js,recomendador.js}
  middleware/{requiereAdmin.js,rateLimiters.js,requestLogger.js}
  data/{storage.js,productos.json,solicitudes.js}
  scripts/init-db.js
.github/workflows/pages.yml
index.html
package.json
.env.example
```

`public/js/chatbot.js` controla el widget flotante. La integración de IA está habilitada en `src/routes/recomendador.js`; el backend lee `OPENAI_API_KEY` desde el entorno. Si no hay clave, usa reglas deterministas por sabor, tamaño y ocasión. El frontend no recibe ni contiene la clave.

## Requisitos y ejecución local

Requiere Node.js 22.13 o superior y npm. Desde PowerShell en la raíz:

```powershell
Copy-Item .env.example .env
npm install
node -e "require('bcryptjs').hash('ELIGE_UNA_CONTRASENA_SEGURA', 12).then(console.log)"
```

Copia el hash generado a `ADMIN_PASSWORD_HASH` dentro de `.env`, elige un usuario administrativo y sustituye `SESSION_SECRET` por una cadena aleatoria de al menos 32 caracteres. No guardes la contraseña en el repositorio ni compartas `.env`. `ADMIN_USER` y `ADMIN_USERNAME` son alias; configura solo uno.

```powershell
npm run dev
# o modo normal:
npm start
```

El sitio de desarrollo estará en `http://localhost:3000/`; comprueba `http://localhost:3000/api/health`. `npm run check` comprueba la sintaxis de backend y frontend. `npm run db:init` crea el esquema y aplica la importación inicial; también se ejecuta al arrancar el servidor. Con `DATABASE_URL`, se usa PostgreSQL. Sin esa variable en desarrollo, se usa SQLite en `src/data/michemango.sqlite`. PostgreSQL es obligatorio en producción. Los archivos SQLite locales se excluyen de Git.

## Variables privadas del backend

Configúralas en `.env` local o en la configuración de variables secretas del proveedor backend. Nunca las añadas a GitHub Pages ni al JavaScript público.

| Variable | Uso |
|---|---|
| `PORT` | Puerto asignado por el alojamiento; local: `3000`. |
| `NODE_ENV` | `development` local, `production` en el alojamiento. |
| `ADMIN_USER` o `ADMIN_USERNAME` | Usuario administrativo elegido. |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt, nunca la contraseña sin hash. |
| `SESSION_SECRET` | Secreto aleatorio privado, mínimo 32 caracteres. |
| `DATABASE_URL` | Cadena privada de PostgreSQL; obligatoria en producción. |
| `DATABASE_SSL` | `true` solo cuando lo requiera el proveedor. TLS valida certificados. |
| `FRONTEND_ORIGIN` | Origen exacto del frontend. Puede contener una lista separada por comas. |
| `CORS_ORIGINS` | Lista adicional de orígenes exactos permitidos, combinada con `FRONTEND_ORIGIN`. |
| `SESSION_SAME_SITE` | `lax`, `strict` o `none`; el proxy de mismo origen usa `lax`. |
| `SESSION_SECURE` | `true` en HTTPS; `SameSite=None` exige cookie segura en producción. |
| `SESSION_COOKIE_DOMAIN` | Opcional, para el dominio compartido propio. |
| `OPENAI_API_KEY` | Opcional; clave privada del proveedor para habilitar la respuesta de IA. Sin ella se usa el fallback por reglas. |
| `OPENAI_MODEL` | Opcional; por defecto `gpt-4o-mini`. |

Para generar el hash local sin instalar herramientas adicionales:

```powershell
node -e "require('bcryptjs').hash('ELIGE_UNA_CONTRASENA_SEGURA', 12).then(console.log)"
```

El archivo `.env.example` solo contiene valores de ejemplo. `.gitignore` excluye `.env`, archivos SQLite, archivos temporales y solicitudes locales. Configura `OPENAI_API_KEY` solo en `.env` local o en los secretos del servicio backend.

## Catálogo y fuente de precios

`src/data/productos.json` es la fuente de precios para la inicialización del catálogo. En uso, el backend obtiene los valores actuales de la base configurada (PostgreSQL desplegado o SQLite local) y el frontend y el recomendador consumen ese mismo endpoint `GET /api/productos`; no hay una segunda lista de precios en JavaScript. Las modificaciones hechas en el panel se guardan en esa base. La configuración del frontend contiene solo el número público de WhatsApp.

## PostgreSQL y persistencia

[Neon](https://neon.tech/) es una opción PostgreSQL compatible con el cliente `pg` del proyecto. Crea un proyecto y una base, abre **Connect**, selecciona Node.js/`node-postgres` y copia la URI privada (normalmente empieza con `postgresql://`) en `DATABASE_URL` de los secretos del backend. Configura `DATABASE_SSL=true` si la instrucción de conexión del proveedor requiere TLS; la conexión valida certificados y no desactiva esa comprobación. No pongas la URI en `public/`, Pages, Git o el chat.

`npm run db:init` y el arranque crean/verifican las tablas `michemango_products`, `michemango_requests`, `michemango_migrations` y, al iniciar Express con PostgreSQL, `michemango_sessions`. Las migraciones de esquema son idempotentes; el import inicial de los JSON legacy ocurre una sola vez y solo si la tabla destino está vacía. El SQLite local crea tablas equivalentes y conserva los datos al reiniciar. Los JSON legacy originales no se borran. Las consultas con valores externos usan parámetros. Ante `SIGINT`/`SIGTERM`, el servidor cierra HTTP y el almacenamiento.

Para verificar persistencia luego de aprovisionar la base, envía una solicitud de prueba, búscala en el panel y consulta en la consola SQL:

```sql
SELECT id, fecha, nombre, correo, telefono, producto_interes, estado
FROM michemango_requests
ORDER BY fecha DESC
LIMIT 5;
```

Reinicia el servicio backend y confirma que la misma solicitud siga en el panel o en SQL. El reinicio de SQLite local no sustituye la prueba de PostgreSQL desplegado; esta última solo se completa tras provisionar una base real.

## API del backend

| Método | Ruta | Acceso / función |
|---|---|---|
| `GET` | `/api/health` | Estado de Express y almacenamiento. |
| `GET` | `/api/productos` | Catálogo público. |
| `POST` | `/api/solicitudes` | Registra contacto; valida nombre, al menos un teléfono/correo, producto, tipo y mensaje. `POST /api/contacto` se conserva como alias. |
| `POST` | `/api/recomendaciones` | Recomienda un producto usando IA privada cuando está configurada o reglas de respaldo. |
| `POST` | `/api/admin/login` | Inicia sesión con bcrypt; tiene límite contra intentos repetidos. |
| `GET` | `/api/admin/session` | Verifica sesión; requiere autenticación. |
| `POST` | `/api/admin/logout` | Cierra sesión autenticada. |
| `GET` | `/api/admin/solicitudes?estado=nueva` | Solicitudes protegidas; filtra `nueva`, `confirmada` o `atendida`. |
| `PATCH` | `/api/admin/solicitudes/:id/estado` | Cambia estado protegido. |
| `DELETE` | `/api/admin/solicitudes/:id` | Elimina una solicitud protegida. |
| `GET/POST/PATCH/DELETE` | `/api/admin/productos` | CRUD protegido del catálogo. |

Helmet configura cabeceras de seguridad. Express limita los cuerpos JSON, valida entradas, aplica límites por IP a solicitudes, login y recomendaciones, y usa un manejador central de errores con identificadores de solicitud. El rate limit predeterminado es en memoria por instancia; si el servicio escala a varios procesos, configúralo con un almacén compartido Redis del proveedor.

## Formularios y panel

El formulario envía `POST /api/solicitudes`, valida también en el servidor y responde con un identificador de seguimiento. Exige un producto de interés válido en el catálogo y al menos uno entre teléfono y correo. El administrador puede filtrar, confirmar, marcar como atendida o eliminar las solicitudes. Los endpoints administrativos de lectura y escritura rechazan usuarios sin sesión (`401`).

El login usa bcrypt y protección contra fuerza bruta. Las cookies son `HttpOnly` y `Secure` en producción. La publicación en Netlify usa un proxy de mismo origen, por lo que configura `SESSION_SAME_SITE=lax` y evita depender de cookies de terceros.

### Cookies entre frontend y API

El frontend publicado usa `https://michemango.netlify.app/api` y la regla de reescritura en `public/_redirects` reenvía las solicitudes al backend. El navegador ve frontend y API bajo el mismo origen; el backend acepta el origen exacto `https://michemango.netlify.app`. Para otro dominio, actualiza `FRONTEND_ORIGIN` y `CORS_ORIGINS` en el backend.

## Asistente de producto

El widget flotante solicita sabor, tamaño y ocasión. Si existe `OPENAI_API_KEY`, el backend pide una sugerencia al modelo configurado, valida que el nombre exista en el catálogo y devuelve solo el producto y su motivo. Si no hay clave, falla el proveedor o su respuesta no coincide con el catálogo, se usa el modo de reglas y la respuesta lo indica. El precio mostrado se obtiene del catálogo vigente del backend.

La clave se obtiene directamente del proveedor y se guarda como secreto del backend; no la pegues en `public/`, el navegador, Git, capturas ni mensajes. Antes de habilitar IA pública, revisa el costo, límites, condiciones del proveedor y tratamiento de datos. No se envían nombre, correo ni teléfono al modelo.

## WhatsApp y precios vigentes

`public/js/config.js` tiene el número internacional de WhatsApp obtenido del sitio original del proyecto. Es un único valor usado por el botón flotante, el contacto y el pedido. Los precios actuales residen en `src/data/productos.json` para sembrar la base nueva y luego en la base activa; frontend y recomendador leen el catálogo vigente desde el servidor. No mantengas otra copia de precios en los archivos públicos. El pedido solo abre un borrador de WhatsApp; no registra una venta ni confirma que se haya enviado.

## Publicar en Netlify y Render

El frontend se publica desde `public/` en Netlify. El backend y PostgreSQL se describen en el Blueprint [render.yaml](./render.yaml), con servicio Node.js `michemango-api` y base PostgreSQL en la misma región. El Blueprint usa planes pagos de Render; revisa el costo mostrado por Render antes de aprobar la creación.

1. En Render, crea un **Blueprint** desde este repositorio y aprueba la configuración de `render.yaml`. Render creará el servicio y la base, conectará `DATABASE_URL`, generará `SESSION_SECRET` y usará `npm ci` / `npm start`.
2. Cuando Render lo solicite, define `ADMIN_USER` y proporciona en `ADMIN_PASSWORD_HASH` un hash bcrypt vigente. No pongas la contraseña sin hash; si pudo quedar expuesta, cámbiala y genera un hash nuevo antes de desplegar. `OPENAI_API_KEY` es opcional; si queda vacío, el recomendador funciona con reglas. No compartas esos valores ni los añadas al repositorio.
3. Espera el despliegue y verifica `https://<URL-REAL-DEL-SERVICIO>/api/health`. La URL esperada por el nombre del Blueprint es `https://michemango-api.onrender.com`, pero usa la URL exacta que Render muestre.
4. En Netlify, conecta el repositorio y publica la carpeta `public`. Abre [public/_redirects](./public/_redirects) y reemplaza solo el host de `michemango-api.onrender.com` por la URL real de Render si es distinta. Conserva la ruta `/api/:splat` y el código `200`. `apiBasePublicada` debe seguir siendo `/api` en [public/js/config.js](./public/js/config.js); así el navegador usa el proxy del mismo origen.
5. Espera el despliegue de Netlify. Abre `https://michemango.netlify.app/api/health` y `https://michemango.netlify.app/api/productos`; la primera respuesta debe indicar `status: "ok"` y la segunda debe listar el catálogo.
6. Comprueba el origen permitido directamente con `curl.exe -i -H "Origin: https://michemango.netlify.app" https://<URL-REAL-DEL-SERVICIO>/api/productos`. La respuesta debe incluir `Access-Control-Allow-Origin: https://michemango.netlify.app` y `Access-Control-Allow-Credentials: true`. Para preflight, añade `-X OPTIONS -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"` y consulta `/api/solicitudes`; se espera `204`.
7. Envía una solicitud desde el sitio, inicia sesión, cambia su estado en el panel y recarga para comprobar persistencia. Revisa en Chrome, Edge y móvil que la cookie tenga `HttpOnly`, `Secure` y `SameSite=Lax`, y que una ruta administrativa sin sesión responda `401`.

No hace falta cambiar la URL de API en JavaScript cuando el hostname del servicio varíe: cambia únicamente el destino de `/api/*` en `public/_redirects`. La publicación del backend y de Netlify requiere acceso a las cuentas del propietario.

El workflow `.github/workflows/pages.yml` sigue disponible para GitHub Pages, pero Pages no ejecuta Express ni el proxy de Netlify. Si se cambia el frontend a Pages, se necesita un proxy independiente y actualizar el origen CORS.

## Checklist antes de aceptar pedidos

- [ ] Agregar una clave propia en `OPENAI_API_KEY` en los secretos del backend si se quiere la respuesta del proveedor; sin ella se mantiene activo el modo de reglas.
- [ ] Aprovisionar el Blueprint de Render y completar los secretos administrativos.
- [ ] Reemplazar el host del proxy en `public/_redirects` si Render asignó una URL distinta.
- [ ] Probar catálogo, formulario, login y persistencia desde Netlify en Chrome, Edge y móvil.
- [ ] Revisar cada estado y el borrador de WhatsApp; el borrador no confirma una compra.

## Pruebas y límites actuales

Los checks locales se ejecutan con `npm run check`; el flujo PostgreSQL y el despliegue público requieren las cuentas y URL reales del propietario. El proxy queda preparado para `michemango-api.onrender.com`, pero no se ha creado el servicio de Render desde este entorno. La persistencia PostgreSQL, CORS/cookies públicos y la disponibilidad real en Netlify deben verificarse después de desplegar. La prueba local no sustituye esas comprobaciones.
