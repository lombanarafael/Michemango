# MicheMango

Sitio de catálogo para el emprendimiento MicheMango. El frontend estático se publica en GitHub Pages; el servidor Express ofrece la API, recibe consultas y protege la administración.

## Estructura del proyecto

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
  routes/{admin.js,adminApi.js,contacto.js}
  middleware/requiereAdmin.js
  data/{storage.js,productos.json,solicitudes.js}
.github/workflows/pages.yml
index.html
package.json
README.md
.env.example
```

`public/js/chatbot.js` es el nombre solicitado, pero implementa un recomendador determinista de productos basado en preferencias y presupuesto. No es una conversación ni una inteligencia artificial. `src/prompts/` y `src/views/` no se necesitan en la implementación actual; se mantienen vacías por si se añaden vistas o prompts en el futuro.

## Requisitos y ejecución local

Requiere Node.js 18 o superior y npm. En PowerShell, desde la raíz:

```powershell
Copy-Item .env.example .env
npm install
node -e "require('bcryptjs').hash('ELIGE_UNA_CONTRASENA_SEGURA', 12).then(console.log)"
```

Copia el hash resultante a `ADMIN_PASSWORD_HASH` en `.env`, configura `ADMIN_USERNAME` y reemplaza `SESSION_SECRET` por un valor aleatorio de al menos 32 caracteres. No pongas la contraseña en el archivo ni compartas `.env`. En desarrollo, `DATABASE_URL` puede dejarse vacío para usar los JSON locales.

```powershell
npm start
```

La página local queda en `http://localhost:3000/`. La API local usa ese mismo servidor. Comprueba su estado en `http://localhost:3000/api/health`. Para usar Live Server, abre `public/index.html`; `config.js` reconoce `localhost` y `127.0.0.1` y conecta con el backend local.

`npm run check` verifica sintaxis del backend. `npm install` mantiene `package-lock.json` en sincronía.

## Configuración

### API

La URL del backend se configura una sola vez en `public/js/config.js`, variable `apiBasePublicada`. Déjala vacía en desarrollo. Después del despliegue, reemplázala por el origen HTTPS real del servicio, sin `/` final, por ejemplo `https://<tu-servicio>`. No se ha inventado ni configurado una URL pública.

También se puede asignar `window.MICHEMANGO_API_URL` antes de cargar `config.js`; todos los módulos (`catalogo.js`, `contacto.js`, `admin/login.js` y `admin/panel.js`) llaman la API a través de la configuración central.

### CORS

En el backend, `CORS_ORIGINS` contiene una lista separada por comas de orígenes completos exactos, sin rutas ni comodines. En local, usa:

```text
http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000,http://127.0.0.1:3000
```

En producción, añade el origen real de Pages, por ejemplo `https://<usuario>.github.io`. El proyecto puede publicarse bajo `/<repositorio>/`, pero ese segmento no forma parte del origen. Si utilizas un dominio personalizado de Pages, configura ese dominio como origen en lugar del ejemplo. El backend valida la lista y rechaza orígenes no incluidos; nunca se habilita `*`.

### WhatsApp y productos

- En `public/js/config.js`, `whatsappNumber` (`573000000000`) es un **valor ficticio de ejemplo**, no el número del negocio. Sustitúyelo por el número internacional real, solo dígitos, y cambia `whatsappIsExample` a `false`.
- `src/data/productos.json` contiene productos y precios de demostración. Confirma el catálogo y actualiza allí los precios iniciales antes de usarlo. Las ediciones posteriores del panel se escriben en el almacenamiento configurado.

## Catálogo y pedidos

`GET /api/productos` entrega los productos vigentes. El catálogo y el recomendador usan esa respuesta, y el panel protegido permite agregar, editar y quitar productos. Las cantidades se validan (entero entre 1 y 99), los subtotales y el total se calculan a partir del precio del catálogo, y el resumen permite retirar líneas.

“Preparar pedido en WhatsApp” abre la aplicación o el sitio de WhatsApp con nombres, cantidades, subtotales y total estimado codificados en la URL. No registra la venta ni confirma que el mensaje se haya enviado. El número ficticio se advierte en pantalla. El pedido actualmente no se persiste en el servidor; si se implementa ese registro, el backend debe calcular de nuevo los subtotales usando sus propios precios, nunca los importes del navegador.

El recomendador ofrece preferencias (dulce, ácido, picante o refrescante) y presupuesto máximo, puntuando términos en la descripción actual. Sus sugerencias son reglas programadas, no IA.

## Formulario y endpoints

`POST /api/contacto` valida nombre, correo, teléfono opcional, tipo y mensaje en el servidor. Tras guardar devuelve un código de seguimiento. El panel obtiene la solicitud guardada mediante `GET /api/admin/solicitudes` y permite cambiar su estado o eliminarla.

Otros endpoints:

| Método | Ruta | Acceso |
|---|---|---|
| `GET` | `/api/health` | Público; informa estado y tipo de almacenamiento |
| `GET` | `/api/productos` | Público |
| `POST` | `/admin/login` | Público; credenciales comparadas con bcrypt |
| `POST` | `/admin/logout` | Sesión administrativa |
| `GET/POST/PATCH/DELETE` | `/api/admin/productos` | Sesión administrativa |
| `GET/PATCH/DELETE` | `/api/admin/solicitudes` | Sesión administrativa |

Un visitante sin sesión recibe `401` al acceder a la API de administración. Las páginas administrativas son estáticas, así que se pueden abrir desde Pages, pero no exponen datos ni permiten cambios sin una sesión aceptada por el backend.

## Almacenamiento y persistencia

En desarrollo, si `DATABASE_URL` está vacío, productos y solicitudes se escriben en `src/data/productos.json` y `src/data/solicitudes.json`. Ese modo conserva datos entre reinicios locales, pero un archivo en disco de un alojamiento efímero **no es almacenamiento persistente garantizado**. Las solicitudes se excluyen de Git.

Para producción el servidor exige PostgreSQL mediante `DATABASE_URL`. Al arrancar crea las tablas de productos y solicitudes, importa catálogo/solicitudes JSON existentes solo si sus tablas de destino están vacías, y conserva los JSON originales como respaldo. La sesión administrativa también usa PostgreSQL (`michemango_sessions`) en vez del almacén volátil predeterminado. El primer inicio y la conexión real a la base deben verificarse antes de aceptar datos. Si el proveedor requiere TLS, configura `DATABASE_SSL=true`; usa el modo TLS que indique el proveedor.

No se necesita entregar la URL de la base dentro del repositorio. Cuando crees una instancia PostgreSQL, copia la cadena de conexión privada en la variable de entorno `DATABASE_URL` del servicio backend. Mantén `DATABASE_SSL=false` salvo que la configuración del proveedor solicite TLS.

## Administración y seguridad

Las credenciales están en variables privadas del backend: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` y `SESSION_SECRET`. El servidor no acepta contraseñas desde JavaScript salvo el envío del formulario de login sobre HTTPS; el hash no está en el frontend. La cookie de sesión es `HttpOnly`, `Secure` en producción y `SameSite=None` entre dominios, y las rutas revisan autorización en el servidor. `connect-pg-simple` conserva sesiones en PostgreSQL.

Como Pages y el backend suelen tener dominios distintos, algunos navegadores pueden bloquear cookies de terceros. Verifica el inicio de sesión desde la URL de Pages en el navegador objetivo; para producción fiable se recomienda un dominio propio con frontend y API en el mismo sitio o una solución de identidad apropiada a la plataforma. CORS por sí solo no sustituye autenticación ni autorización.

## GitHub Pages

`.github/workflows/pages.yml` publica solo `public/` en cada push a `main` y al ejecutarse manualmente. `public/index.html` es la página de entrada. Los enlaces a estilos, scripts y secciones son relativos para que funcionen cuando el proyecto se sirve bajo `/<repositorio>/`. El `index.html` de la raíz solo es una redirección de conveniencia para Live Server y no forma parte del artefacto de Pages.

1. Sube el repositorio a GitHub.
2. En **Settings → Pages**, elige **GitHub Actions** como origen.
3. Crea y despliega el backend y la base de datos (siguientes instrucciones).
4. Configura `apiBasePublicada` en `public/js/config.js` con la URL real HTTPS del backend y confirma el cambio en el repositorio.
5. Configura en el backend `CORS_ORIGINS` con el origen real de Pages y revisa la ejecución del workflow en **Actions**.
6. Comprueba la URL asignada por GitHub y carga el catálogo desde la API; la conexión no está lista hasta completar estas verificaciones.

El workflow sube solamente `public/`; no publica `.env`, el código del backend ni los datos locales.

## Despliegue del backend

Usa un servicio que ejecute Node.js/Express y PostgreSQL administrado. En el servicio Node configura el repositorio y la raíz del proyecto (la carpeta que contiene `package.json`), comando de inicio `npm start`, y estas variables privadas:

```text
NODE_ENV=production
PORT=<lo proporciona la plataforma>
ADMIN_USERNAME=<usuario que elijas>
ADMIN_PASSWORD_HASH=<hash bcrypt generado localmente>
SESSION_SECRET=<secreto aleatorio de 32 o más caracteres>
DATABASE_URL=<cadena privada de PostgreSQL del proveedor>
DATABASE_SSL=<true solo si el proveedor requiere TLS>
CORS_ORIGINS=<origen exacto real de GitHub Pages>
```

El servidor escucha `process.env.PORT`. Despliega, verifica `GET https://<backend-real>/api/health`, y después `GET https://<backend-real>/api/productos`. No compartas ni subas el secreto, la cadena de base de datos o el hash de configuración. Los datos JSON existentes no se borran: la inicialización los copia solo si la tabla respectiva está vacía.

No se ha desplegado ningún servicio externo ni se ha comprobado una URL pública. La creación de la cuenta, la base PostgreSQL y la entrada de sus credenciales privadas deben realizarse por el propietario.

## Pruebas finales sugeridas

1. `npm run check`; inicia `npm start`; revisa `/api/health` y `/api/productos`.
2. En el sitio, filtra catálogo y recomendador, prueba varios presupuestos, cambia cantidades, agrega/elimina líneas y comprueba los importes.
3. Con una herramienta de navegador, comprueba el enlace generado antes de contactar al número real.
4. Envía un formulario válido y otro inválido; verifica el código de seguimiento y la solicitud en el panel.
5. Sin sesión pide `/api/admin/productos` (debe responder `401`); entra al panel, crea/edita/elimina un registro de prueba y cierra sesión.
6. Cuando haya backend y Pages públicos, prueba también el origen CORS correcto e incorrecto y que las cookies de sesión funcionen desde Pages.

## Explicación para la sustentación

GitHub Pages entrega los archivos estáticos de `public/` al navegador. `config.js` les proporciona la dirección del backend; el JavaScript de catálogo y contacto consume endpoints de Express. Las rutas validan datos y, en administración, exigen una sesión autenticada. En desarrollo Express guarda los datos en JSON locales; en producción, PostgreSQL conserva catálogo, solicitudes y sesiones entre reinicios. Git registra el código y el workflow automatiza el despliegue de los archivos públicos, pero no ejecuta Express.

No se presenta IA real en el proyecto. Si el requisito escolar exige una, se debe agregar un modelo o proveedor real llamado desde el backend, proteger allí la clave y evaluar costos, permisos y privacidad; el recomendador actual no reemplaza ese requisito.
