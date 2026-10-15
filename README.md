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
index.html
package.json
.env.example
```

`public/js/chatbot.js` controla el widget flotante de recomendación. Las sugerencias se calculan exclusivamente con reglas propias en `src/routes/recomendador.js`, basadas en sabor, tamaño y ocasión. No se hacen llamadas a servicios externos ni se usa IA.

## Requisitos y ejecución local

Requiere Node.js 22.13 o superior y npm. Desde PowerShell en la raíz:

```powershell
Copy-Item .env.example .env
npm install
npm run admin:hash
```

Escribe y confirma una contraseña nueva en la terminal (no se muestra); el comando imprime únicamente su hash bcrypt. Copia ese hash a `ADMIN_PASSWORD_HASH` en `.env`. Elige un usuario administrativo y sustituye `SESSION_SECRET` por una cadena aleatoria de al menos 32 caracteres. No pongas la contraseña en argumentos de comandos ni la guardes en el repositorio. `ADMIN_USER` y `ADMIN_USERNAME` son alias; configura solo uno.

```powershell
npm run dev
# o modo normal:
npm start
```

El sitio de desarrollo estará en `http://localhost:3000/`; comprueba `http://localhost:3000/api/health`. `npm run check` comprueba la sintaxis de backend y frontend. `npm run db:init` crea el esquema y aplica la importación inicial; también se ejecuta al arrancar el servidor. Con `DATABASE_URL`, se usa PostgreSQL. Sin esa variable en desarrollo, se usa SQLite en `src/data/michemango.sqlite`. PostgreSQL es obligatorio en producción. Los archivos SQLite locales se excluyen de Git.

## Variables privadas del backend

Configúralas en `.env` local o en la configuración de variables secretas del proveedor backend. Nunca las añadas al frontend público ni las publiques en Git.

| Variable | Uso |
|---|---|
| `PORT` | Puerto asignado por el alojamiento; local: `3000`. |
| `NODE_ENV` | `development` local, `production` en el alojamiento. |
| `ADMIN_USER` o `ADMIN_USERNAME` | Usuario administrativo elegido. |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt, nunca la contraseña sin hash. |
| `SESSION_SECRET` | Secreto aleatorio privado, mínimo 32 caracteres. |
| `DATABASE_URL` | Cadena privada de PostgreSQL; obligatoria en producción. |
| `DATABASE_SSL` | `true` para Neon; TLS valida certificados. |
| `FRONTEND_ORIGIN` | Origen exacto del frontend. Puede contener una lista separada por comas. |
| `CORS_ORIGINS` | Lista adicional de orígenes exactos permitidos, combinada con `FRONTEND_ORIGIN`. |
| `SESSION_SAME_SITE` | `lax`, `strict` o `none`; el proxy de mismo origen usa `lax`. |
| `SESSION_SECURE` | `true` en HTTPS; `SameSite=None` exige cookie segura en producción. |
El archivo `.env.example` solo contiene valores de ejemplo. `.gitignore` excluye `.env`, archivos SQLite, archivos temporales y solicitudes locales. No hace falta ninguna clave de IA ni servicio externo para recomendar productos.

## Catálogo y fuente de precios

`src/data/productos.json` es la fuente de precios para la inicialización del catálogo. En uso, el backend obtiene los valores actuales de la base configurada (PostgreSQL desplegado o SQLite local) y el frontend y el recomendador consumen ese mismo endpoint `GET /api/productos`; no hay una segunda lista de precios en JavaScript. Las modificaciones hechas en el panel se guardan en esa base. La configuración del frontend contiene solo el número público de WhatsApp.

## PostgreSQL y persistencia

[Neon Free](https://neon.com/pricing) ofrece PostgreSQL permanente (no es una prueba de 30 días) y no requiere tarjeta de crédito según su [página oficial de planes](https://neon.com/docs/introduction/plans). El nivel gratuito publica límites: 1 GB de almacenamiento por proyecto (hasta 20 GB por cuenta), 100 CU-horas por proyecto al mes y 5 GB de transferencia mensual. El cómputo se duerme tras 5 minutos inactivo y vuelve a activarse al consultar. Incluye una instantánea manual y una ventana corta de recuperación; no tiene copias programadas, así que exporta aparte los datos importantes y no lo trates como almacenamiento de respaldo. Los límites y términos pueden cambiar; revisa los enlaces oficiales antes de crear la cuenta y no agregues un método de pago.

En Neon crea un proyecto y una base, abre **Connect**, selecciona Node.js/`node-postgres` y copia la cadena de conexión con pooler en `DATABASE_URL` en la configuración privada de Render. Usa `DATABASE_SSL=true`; el cliente valida certificados TLS. No pongas la URI en `public/`, Git o mensajes. No uses la base PostgreSQL gratuita de Render: expira a los 30 días.

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
| `POST` | `/api/recomendaciones` | Recomienda un producto con reglas según sabor, tamaño y ocasión. |
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

El recomendador pregunta por sabor, tamaño y ocasión y aplica reglas deterministas al catálogo vigente. No usa IA, APIs externas, claves ni servicios con costo. La recomendación no modifica precios ni disponibilidad.

## WhatsApp y precios vigentes

`public/js/config.js` tiene el número internacional de WhatsApp obtenido del sitio original del proyecto. Es un único valor usado por el botón flotante, el contacto y el pedido. Los precios actuales residen en `src/data/productos.json` para sembrar la base nueva y luego en la base activa; frontend y recomendador leen el catálogo vigente desde el servidor. No mantengas otra copia de precios en los archivos públicos. El pedido solo abre un borrador de WhatsApp; no registra una venta ni confirma que se haya enviado.

## Publicar gratis en Netlify, Render y Neon

El sitio estático usa Netlify Free con el subdominio existente `michemango.netlify.app`. El backend es un Web Service Render Free y la base PostgreSQL persistente es Neon Free. No se requiere dominio propio ni se usa la base de Render.

### Costos y límites (consultados el 14 de octubre de 2026)

| Servicio | Costo previsto | Condición para no generar cobros |
|---|---:|---|
| Netlify Free | $0 | 300 créditos mensuales en el plan actual; al agotarse, los sitios se pausan. No actives auto-recarga ni cambies a un plan pago. Los equipos antiguos pueden tener condiciones heredadas. |
| Render Web Service Free | $0 | Duerme tras 15 minutos, sistema de archivos temporal y cupo compartido de 750 horas/mes. No agregues método de pago; si se llegara a un uso facturable sin tarjeta, Render indica que suspende el servicio. Render recomienda Free para proyectos de hobby, no para aplicaciones de producción. |
| Neon Free PostgreSQL | $0 | Plan permanente, sin tarjeta según Neon; límites de 1 GB/proyecto, 100 CU-horas/proyecto/mes y 5 GB de transferencia/proyecto/mes. Sin copias programadas. No agregues método de pago. |
| Librerías del proyecto, Google Fonts y recomendador por reglas | $0 | Sin licencias de pago, API de IA, correo, SMS, mapas, analítica ni almacenamiento externo adicional. |

Los límites pueden cambiar. La documentación pública de Netlify no asegura que todos los procesos de alta pidan o no tarjeta; el sitio ya está creado, así que conserva el plan Free actual y no ingreses datos de pago si el panel los solicita.

1. **Conserva Netlify Free.** Mantén el sitio en `michemango.netlify.app`, publica `public/` y no compres dominio ni actives auto-recarga o funciones pagas. La documentación actual indica 300 créditos mensuales con un límite estricto para Free: cuando se agotan, los sitios se pausan hasta el siguiente ciclo; no habilites upgrades. Algunos equipos antiguos tienen planes heredados con condiciones diferentes, así que verifica **Billing** y confirma que siga siendo Free. Fuentes: [créditos de Netlify](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/) y [FAQ de facturación](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/). La documentación no garantiza que todos los flujos de alta de cuentas sean libres de pedir tarjeta; no añadas información de pago y detente si Netlify la solicita.
2. **Comprueba Render Free.** El Web Service configurado en [render.yaml](./render.yaml) usa `plan: free`. Render documenta que duerme tras 15 minutos sin tráfico, tarda alrededor de un minuto en volver y tiene un sistema de archivos efímero. El cupo incluye 750 horas de instancia por espacio de trabajo y mes. Si se agota el ancho de banda, las horas o el límite de compilación, Render puede suspender el servicio o impedir nuevos despliegues. Si no agregas método de pago, Render dice que suspenderá los servicios cuando el uso pudiera generar cargos. No agregues tarjeta ni cambies a un plan pago. Detalles: [Render Free](https://render.com/docs/free) y [FAQ de Render](https://render.com/docs/faq).
3. **Crea la base gratuita en Neon.** Usa el plan Free permanente, no una prueba. Según su [página oficial](https://neon.com/pricing), no pide tarjeta. Mantente dentro de 1 GB por proyecto (20 GB total por cuenta), 100 CU-horas y 5 GB de transferencia por proyecto al mes; el cómputo se duerme tras 5 minutos y se reactiva al recibir consultas. Free incluye una instantánea manual y una ventana de recuperación de seis horas (hasta 1 GB de historial), pero no copias programadas. Exporta los datos importantes por tu cuenta. Fuentes: [planes Neon](https://neon.com/docs/introduction/plans) y [scale-to-zero](https://neon.com/docs/introduction/scale-to-zero). No añadas método de pago.
4. En Neon crea el proyecto y copia desde **Connect** la URI PostgreSQL con pooler. No la publiques. En Render crea un **Blueprint** desde este repositorio con [render.yaml](./render.yaml); el servicio debe decir **Free** y no se crea una base de datos en Render. Antes de seguir, genera una contraseña administrativa nueva con `npm run admin:hash` en una terminal local y pega solo el hash impreso. Cuando Render lo solicite, pega `DATABASE_URL`, `ADMIN_USER` y el `ADMIN_PASSWORD_HASH`; Render genera `SESSION_SECRET`. Conserva `NODE_ENV=production`, `DATABASE_SSL=true`, `FRONTEND_ORIGIN=https://michemango.netlify.app`, `CORS_ORIGINS=https://michemango.netlify.app`, `SESSION_SECURE=true` y `SESSION_SAME_SITE=lax`. No configures otros servicios ni agregues tarjeta.
5. Despliega el servicio y copia la URL HTTPS exacta que Render asigne. El nombre inicial es `michemango-api`, pero el subdominio puede no estar disponible. Verifica `https://<URL-REAL-DEL-SERVICIO>/api/health`.
6. En [public/_redirects](./public/_redirects), cambia únicamente el host `backend-url-pendiente.invalid` por el host de la URL HTTPS real que Render asignó. Mantén `/api/*`, la ruta `/api/:splat` y el código `200`. No cambies `apiBasePublicada = "/api"` en [public/js/config.js](./public/js/config.js); el navegador usará el proxy de mismo origen y las cookies administrativas.
7. En Netlify conserva el plan **Free**, el subdominio `michemango.netlify.app` y la carpeta publicada `public`. No configures dominio propio ni actives auto-recarga ni funciones pagas. Después del despliegue, comprueba `https://michemango.netlify.app/api/health` y `/api/productos`.
8. Envía una solicitud de prueba, inicia sesión, cambia su estado en el panel, recarga y confirma que persiste en Neon. La ruta administrativa sin sesión debe devolver `401`. Si Render había dormido, la página mostrará «Despertando el servidor, un momento...» y reintentará el chequeo durante el arranque.

El frontend no debe escribir datos persistentes en el disco de Render: su sistema de archivos se borra al reiniciar, desplegar o dormir. El código usa SQLite solo en desarrollo local y exige `DATABASE_URL` en producción. No uses el PostgreSQL gratuito de Render, que expira a los 30 días. Si se alcanza un límite gratuito, los sitios o el servicio pueden detenerse o suspenderse; no añadas tarjeta para sortearlo. Los límites, términos y créditos de cada proveedor pueden cambiar: comprueba siempre el panel y los enlaces oficiales antes de aceptar cambios.

El frontend se publica solo en Netlify; el repositorio ya no activa una publicación paralela en GitHub Pages.

## Checklist antes de aceptar pedidos

- [ ] Crear Neon Free y Render Web Service Free; comprobar que no se agregó método de pago.
- [ ] Completar `DATABASE_URL`, usuario y hash del administrador en Render.
- [ ] Reemplazar el host del proxy en `public/_redirects` si Render asignó una URL distinta.
- [ ] Probar catálogo, formulario, login y persistencia desde Netlify en Chrome, Edge y móvil.
- [ ] Revisar cada estado y el borrador de WhatsApp; el borrador no confirma una compra.

## Pruebas y límites actuales

Los checks locales se ejecutan con `npm run check`; el flujo PostgreSQL y el despliegue público requieren las cuentas y URL reales del propietario. El proxy tiene un destino reservado no resoluble (`backend-url-pendiente.invalid`) para evitar enviar solicitudes a un servicio ajeno antes de crear el backend. No se ha creado el servicio de Render ni la base Neon desde este entorno. La persistencia PostgreSQL, CORS/cookies públicos y la disponibilidad real en Netlify deben verificarse después de desplegar. La prueba local no sustituye esas comprobaciones.
