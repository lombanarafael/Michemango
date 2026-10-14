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
| `CORS_ORIGINS` | Alias de compatibilidad; se usa si no se definió `FRONTEND_ORIGIN`. |
| `SESSION_SAME_SITE` | `lax`, `strict` o `none`; producción usa `none` de forma predeterminada. |
| `SESSION_SECURE` | `true` en HTTPS; `SameSite=None` exige cookie segura en producción. |
| `SESSION_COOKIE_DOMAIN` | Opcional, para el dominio compartido propio. |
| `OPENAI_API_KEY` | Opcional; clave privada del proveedor para habilitar la respuesta de IA. Sin ella se usa el fallback por reglas. |
| `OPENAI_MODEL` | Opcional; por defecto `gpt-4o-mini`. |

Para generar el hash local sin instalar herramientas adicionales:

```powershell
node -e "require('bcryptjs').hash('ELIGE_UNA_CONTRASENA_SEGURA', 12).then(console.log)"
```

El archivo `.env.example` solo contiene valores de muestra. `.gitignore` excluye `.env`, archivos SQLite, archivos temporales y solicitudes locales. Configura `OPENAI_API_KEY` solo en `.env` local o en los secretos del servicio backend.

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

El login usa bcrypt y protección contra fuerza bruta. Las cookies son `HttpOnly`; en producción son `Secure` y usan `SameSite=None` para permitir el flujo entre dominios, con `credentials: "include"` y CORS con credenciales. Las cookies de terceros pueden ser bloqueadas por el navegador, incluso con esos atributos; el login no se debe considerar probado en producción hasta verificarlo en los navegadores objetivo.

### Cookies entre Pages y API

La opción más simple para conservar cookies es asignar un dominio propio al frontend de Pages (por ejemplo `www.tudominio.com`) y usar un subdominio para la API (`api.tudominio.com`). Ambos quedan bajo el mismo sitio registrable; configura el origen CORS exacto, HTTPS y, si se necesita, `SESSION_COOKIE_DOMAIN=.tudominio.com`.

Alternativamente, pon un proxy inverso delante del backend y sirve la API bajo el mismo origen del frontend, por ejemplo `www.tudominio.com/api/*`. GitHub Pages por sí solo solo entrega archivos estáticos y **no puede ejecutar un proxy**. Para esa opción se requiere una capa de proxy real, como Cloudflare Worker/Reverse Proxy, que reenvíe `/api/*` al servidor Node sin exponer secretos. El Worker no debe suplantar al cliente ni omitir la autenticación. Un dominio personalizado con subdominios suele ser la alternativa más sencilla.

## Asistente de producto

El widget flotante solicita sabor, tamaño y ocasión. Si existe `OPENAI_API_KEY`, el backend pide una sugerencia al modelo configurado, valida que el nombre exista en el catálogo y devuelve solo el producto y su motivo. Si no hay clave, falla el proveedor o su respuesta no coincide con el catálogo, se usa el modo de reglas y la respuesta lo indica. El precio mostrado se obtiene del catálogo vigente del backend.

La clave se obtiene directamente del proveedor y se guarda como secreto del backend; no la pegues en `public/`, el navegador, Git, capturas ni mensajes. Antes de habilitar IA pública, revisa el costo, límites, condiciones del proveedor y tratamiento de datos. No se envían nombre, correo ni teléfono al modelo.

## WhatsApp y precios vigentes

`public/js/config.js` tiene el número internacional de WhatsApp obtenido del sitio original del proyecto. Es un único valor usado por el botón flotante, el contacto y el pedido. Los precios actuales residen en `src/data/productos.json` para sembrar la base nueva y luego en la base activa; frontend y recomendador leen el catálogo vigente desde el servidor. No mantengas otra copia de precios en los archivos públicos. El pedido solo abre un borrador de WhatsApp; no registra una venta ni confirma que se haya enviado.

## GitHub Pages

`.github/workflows/pages.yml` publica solo `public/` en la rama `main` o al ejecutarlo manualmente. `public/index.html` es la entrada y usa recursos relativos para funcionar bajo `/<repositorio>/`. La raíz `index.html` sirve solo para Live Server.

1. En GitHub abre **Settings → Pages** y elige **GitHub Actions** como origen. Para este repositorio, la URL de proyecto esperada es `https://lombanarafael.github.io/Michemango/` y el origen (sin ruta final) es `https://lombanarafael.github.io`.
2. Provisiona/despliega el backend con una URL HTTPS propia del servicio; por ejemplo `https://<nombre-del-servicio>.onrender.com`. No inventes un hostname: sustituye el ejemplo por el asignado al crear el servicio.
3. En la configuración privada del backend, establece `FRONTEND_ORIGIN=https://lombanarafael.github.io` (o el dominio propio exacto), `NODE_ENV=production`, `DATABASE_URL`, `DATABASE_SSL=true` según indique PostgreSQL, `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` y `SESSION_SECURE=true`. `OPENAI_API_KEY` se agrega ahí para activar el modo IA; si no se configura, el fallback por reglas sigue funcionando.
4. Antes de publicar el frontend, reemplaza `apiBasePublicada = ""` en `public/js/config.js` por el origen HTTPS real, sin ruta ni `/` final, por ejemplo `apiBasePublicada = "https://<nombre-del-servicio>.onrender.com"`. Esta URL es pública, no un secreto.
5. Revisa **Actions**, abre Pages y prueba `GET <API>/api/productos`. La respuesta debe incluir `Access-Control-Allow-Origin: https://lombanarafael.github.io` y `Access-Control-Allow-Credentials: true`.
6. Comprueba envío de formulario y asistente. Luego inicia sesión desde la página Pages y verifica que `/api/admin/session` responda autenticado. DevTools → Network → login debe mostrar `Set-Cookie` con `HttpOnly`, `Secure` y `SameSite=None`; el navegador debe reenviar la cookie en llamadas protegidas. No publiques ni aceptes formularios hasta completar la prueba.

El workflow no publica el backend, `.env`, claves ni solicitudes locales. No se ha hecho push ni publicación en esta tarea.

## Despliegue sugerido

Una combinación posible es Render Web Service para Node.js y Neon para PostgreSQL:

1. Crea una instancia PostgreSQL administrada. En **Connect**, copia la URI `postgresql://...` privada y guárdala como `DATABASE_URL` del servicio; no la coloques en Pages ni en archivos versionados.
2. Crea el Web Service Node.js conectado al repositorio, selecciona la raíz que contiene `package.json`, fija Node 22 o superior, y usa `npm install` como instalación y `npm start` como comando de inicio. El arranque aplica las migraciones; `npm run db:init` permite inicializar/verificar el esquema manualmente.
3. En los secretos del backend define `NODE_ENV=production`, `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `DATABASE_URL`, `DATABASE_SSL`, `FRONTEND_ORIGIN=https://lombanarafael.github.io`, `SESSION_SECURE=true`, `SESSION_SAME_SITE=none` y `OPENAI_API_KEY` si se dispone de una clave. `PORT` lo proporciona el alojamiento. La IA ya está conectada en el backend, pero sin la clave se usa el modo de reglas.
4. Despliega y verifica `https://<host-real-del-backend>/api/health` y `/api/productos`.
5. En `public/js/config.js`, configura `apiBasePublicada` con ese host HTTPS real; publica Pages después de aprobar el commit.
6. Prueba CORS: `curl.exe -i -H "Origin: https://lombanarafael.github.io" https://<host-real-del-backend>/api/productos`. Debe responder `200` con `Access-Control-Allow-Origin` igual al origen de Pages. Prueba preflight: `curl.exe -i -X OPTIONS -H "Origin: https://lombanarafael.github.io" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type" https://<host-real-del-backend>/api/solicitudes`; se espera `204`.
7. Desde Pages, inicia sesión, revisa `Set-Cookie` y luego la petición con `credentials: include`; confirma que `/api/admin/session` da `200` autenticado y que el listado protegido funciona tras recargar. Si el navegador bloquea cookies de terceros, usa dominios propios bajo el mismo sitio (por ejemplo `www` y `api`) o un proxy de mismo origen como se explica arriba. No reduzcas la seguridad de las cookies ni abras CORS a `*` para sortear el bloqueo.

El servicio y la base remotos no se han creado desde este entorno. Sus URL y variables privadas deben completarse en el hosting antes del despliegue.

## Checklist antes de aceptar pedidos

- [ ] Agregar una clave propia en `OPENAI_API_KEY` en los secretos del backend si se quiere la respuesta del proveedor; sin ella se mantiene activo el modo de reglas.
- [ ] Aprovisionar PostgreSQL, probar registro y persistencia después de reiniciar.
- [ ] Publicar el backend y Pages; fijar la URL HTTPS real de API y verificar catálogo, CORS y formulario.
- [ ] Probar el login y el cierre de sesión desde Pages en Chrome, Edge y los móviles objetivo; solucionar cookies de terceros si el navegador las bloquea.
- [ ] Revisar cada estado y el borrador de WhatsApp; el borrador no confirma una compra.

## Pruebas y límites actuales

Los checks locales se ejecutan con `npm run check`; el flujo PostgreSQL y el despliegue público requieren las cuentas y URL reales del propietario. En este entorno no existe una base PostgreSQL provisionada, URL de backend ni sitio publicado, así que no se afirma que la persistencia PostgreSQL, CORS/cookies públicos o Pages estén probados en producción. Verifica Chrome, Edge y un móvil al publicar; la prueba local no sustituye esas comprobaciones.
