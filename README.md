# MicheMango

Aplicación web para presentar el emprendimiento MicheMango, consultar el catálogo, preparar pedidos para WhatsApp y registrar solicitudes de contacto. El frontend es estático y el backend Express gestiona los datos y protege el panel administrativo.

## Estructura

```text
Michemango-main/
├── public/
│   ├── index.html
│   ├── admin/
│   │   ├── login.html
│   │   └── panel.html
│   ├── css/styles.css
│   └── js/
│       ├── config.js
│       ├── menu.js
│       ├── animaciones.js
│       ├── catalogo.js
│       ├── contacto.js
│       ├── chatbot.js
│       └── admin/
│           ├── login.js
│           └── panel.js
├── src/
│   ├── server.js
│   ├── productos.js
│   ├── routes/
│   ├── middleware/
│   ├── data/
│   ├── prompts/       (no se usa; no hay funciones de IA)
│   └── views/         (no se usa; las páginas estáticas están en public/admin)
├── .github/workflows/pages.yml
├── index.html
├── netlify.toml     (configuración previa de publicación estática, opcional)
├── package.json
├── README.md
└── .env.example
```

`public/js/chatbot.js` conserva el nombre solicitado, pero **no es un chatbot**: contiene un recomendador determinista que puntúa los productos del catálogo según el sabor elegido y filtra por presupuesto. No conversa, no usa servicios de IA y no envía datos a una API de IA.

Se conserva `netlify.toml` y `public/_redirects` como soporte opcional del despliegue estático previo en Netlify; la publicación principal documentada en este proyecto es GitHub Pages.

## Requisitos

- Node.js 18 o superior.
- npm.

## Ejecución local

Desde la carpeta del proyecto, en PowerShell:

```powershell
Copy-Item .env.example .env
npm install
```

Configura en `.env` un hash bcrypt para el administrador y una clave de sesión aleatoria de al menos 32 caracteres. Para generar el hash:

```powershell
node -e "require('bcryptjs').hash('ELIGE_UNA_CONTRASENA_SEGURA', 12).then(console.log)"
```

Pega el resultado en `ADMIN_PASSWORD_HASH`. Genera `SESSION_SECRET` con un valor aleatorio largo. No guardes la contraseña en `.env` ni publiques el archivo `.env`.

Inicia el backend:

```powershell
npm start
```

Abre `http://localhost:3000/`. Express sirve `public/` y la API desde el mismo origen. Para probar con Live Server, abre el `index.html` de la raíz o `public/index.html`; `config.js` usa el backend local en `http://localhost:3000`.

## Configuración editable del negocio

- `public/js/config.js`: configura `apiBasePublicada` con la URL pública del backend una vez desplegado. El número `573000000000` es un **ejemplo**; reemplázalo por el número de WhatsApp real antes de publicar. El sitio avisa que el teléfono todavía es de ejemplo.
- `src/data/productos.json`: catálogo inicial de demostración; los nombres, descripciones y precios actuales son editables y no deben anunciarse como precios oficiales sin confirmación del negocio.
- `.env.example`: plantilla de variables del backend, sin credenciales reales.

## Catálogo y pedidos

`GET /api/productos` entrega el catálogo almacenado en `src/data/productos.json`. El panel permite crear, editar y eliminar productos; esa misma API alimenta el catálogo público y el recomendador. Los filtros, subtotales y total del resumen se calculan en el navegador con los precios que entrega el backend.

El botón de WhatsApp abre un borrador que incluye productos, cantidades y total estimado. MicheMango no registra la compra ni confirma el pedido cuando se abre WhatsApp. Como el pedido no se almacena en el backend, no se recibe un precio desde el navegador para registrar una venta; si luego se añade registro de pedidos, el backend debe volver a calcular el importe usando los precios del catálogo.

## Formulario y datos

`POST /api/contacto` valida en el servidor nombre, correo, teléfono opcional, tipo de solicitud y mensaje; luego guarda la solicitud en `src/data/solicitudes.json`. La respuesta incluye un identificador para comprobar que se registró. El archivo con datos personales está ignorado por Git.

Los archivos JSON son un almacenamiento didáctico para desarrollo o una demostración pequeña, no una base de datos multiusuario. En producción hay que usar almacenamiento persistente (por ejemplo PostgreSQL administrado) o un volumen persistente del proveedor; en muchos servicios Node los archivos locales desaparecen al reiniciarse o redesplegar. `express-session` usa el almacén en memoria por defecto, de modo que las sesiones se cierran al reiniciar el proceso. Para producción con varias instancias se requiere un almacén de sesión persistente.

## Panel administrativo

1. Abre `public/admin/login.html` (en local: `http://localhost:3000/admin/login.html`).
2. El servidor compara el usuario y el hash bcrypt configurados en `.env`.
3. El navegador conserva una cookie `HttpOnly`; el backend revisa la sesión en cada ruta administrativa.
4. `GET/POST/PATCH/DELETE /api/admin/productos` y `GET/PATCH/DELETE /api/admin/solicitudes` devuelven `401` si no hay una sesión autorizada.

La vista puede descargarse como archivo estático, pero eso no da permisos: las operaciones de datos se bloquean en el backend. No incluyas contraseñas, hashes privados ni secretos en `public/`.

## API y CORS

En desarrollo, `config.js` apunta a `http://localhost:3000`. Tras desplegar el backend, establece `apiBasePublicada` en `public/js/config.js`, por ejemplo `https://TU-SERVICIO.example.com` (sin `/` final).

Configura `CORS_ORIGINS` en las variables del servicio backend con el origen exacto del frontend, por ejemplo `https://TU_USUARIO.github.io`; no incluyas comodines ni una ruta como `/Michemango`. El valor debe coincidir con el origen del sitio que muestra el navegador. El servidor habilita credenciales para permitir la cookie de sesión entre orígenes. En producción la cookie es `Secure` y `SameSite=None`; algunos navegadores pueden bloquear cookies de terceros cuando GitHub Pages y el backend usan dominios distintos. Comprueba el login en los navegadores objetivo y, si ese límite causa problemas, aloja el frontend bajo el mismo dominio o adopta un mecanismo de autenticación adecuado a la plataforma.

## Publicación

### Frontend en GitHub Pages

El workflow `.github/workflows/pages.yml` publica exclusivamente la carpeta `public/` cada vez que hay un push a `main`.

1. Sube el repositorio a GitHub y conserva la rama `main`.
2. En **Settings → Pages**, selecciona **GitHub Actions** como fuente.
3. Sustituye `apiBasePublicada` en `public/js/config.js` por la URL HTTPS del backend desplegado y sube ese cambio.
4. Revisa la ejecución de **Publicar frontend en GitHub Pages** en la pestaña **Actions**. El enlace solo debe compartirse cuando el flujo termine correctamente y el sitio responda.

### Backend Node.js

Despliega el repositorio en un servicio que ejecute Node.js y configura el comando `npm start`. Define como variables de entorno `NODE_ENV=production`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` (aleatorio, al menos 32 caracteres) y `CORS_ORIGINS` (origen exacto de Pages). No agregues estas variables al repositorio. Configura almacenamiento persistente para los JSON o migra a una base de datos administrada antes de depender de los datos reales.

El hosting de GitHub Pages **no ejecuta Express**. Publicar el frontend no publica automáticamente la API. Verifica ambas partes por separado: `GET <BACKEND>/api/productos`, un envío de prueba a `POST <BACKEND>/api/contacto`, y acceso a `https://TU_USUARIO.github.io/...`. No afirmes que se publicó ni que una solicitud quedó persistida hasta comprobarlo en el servicio.

## Pruebas manuales sugeridas

1. Confirma que el catálogo carga y que cada filtro cambia los productos visibles.
2. Cambia cantidades y verifica subtotal y total; agrega, quita y revisa productos en el resumen.
3. Pulsa preparar pedido: debe abrir WhatsApp con el borrador y mostrar que el número es solo un ejemplo. No es una compra confirmada.
4. Prueba el recomendador con varias preferencias y presupuestos; sus resultados deben pertenecer al catálogo vigente.
5. Envía el formulario con datos válidos e inválidos; comprueba el identificador de respuesta y la entrada registrada en el panel.
6. Intenta consultar `/api/admin/productos` sin sesión y confirma `401`; inicia sesión y prueba crear, editar y eliminar un producto.
7. En el despliegue, confirma que una dirección de origen no incluida en `CORS_ORIGINS` no pueda usar la API.

## Inteligencia artificial

Este alcance no incluye IA real. Si la guía exige específicamente inteligencia artificial, habrá que añadir una integración distinta, por ejemplo un servicio de modelo generativo llamado exclusivamente desde el backend (con clave privada en variables de entorno), o un modelo clasificador/recomendador desplegado en el servidor. Eso requiere definir proveedor, permisos, costos y protección de datos; no debe presentarse el recomendador actual como IA.
