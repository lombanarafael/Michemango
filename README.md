# 🥭 MicheMango

Tienda web de **MicheMango**, un emprendimiento de miches de mango en Barranquilla.
Proyecto final de la ruta básica del curso *Mi emprendimiento digital* (Jóvenes Creativos).

| Parte | Dónde está publicada |
|---|---|
| Página (React) | Netlify: https://michemango.netlify.app · GitHub Pages: https://lombanarafael.github.io/Michemango/ |
| API (Node + Express) | Render: https://michemango-api.onrender.com (prueba: `/api/health`) |
| Base de datos | PostgreSQL en Neon (en el computador se usa SQLite) |

## Qué hace

- **Inicio** con la marca, el mensaje, las secciones y un menú de navegación.
- **Catálogo** con fotos, categoría, descripción, precio, filtros y cantidad.
- **Pedido**: arma un resumen con el total y lo abre como mensaje de WhatsApp.
- **Contacto**: el formulario guarda cada mensaje en la base de datos.
- **Panel admin** con login (bcrypt + JWT): crear, editar y borrar productos, y gestionar solicitudes.
- **Recomendador** ("Ayúdame a elegir"): sugiere una miche según sabor, tamaño y ocasión, y explica por qué.
  Es un sistema **por reglas con puntos**, no un modelo generativo.
- Diseño **responsive** (celular, tableta y computador).

## Tecnologías

- Frontend: HTML, CSS, JavaScript y **React** (compilado con **Vite**).
- Backend: **Node.js 22 + Express**.
- Base de datos: **PostgreSQL** (Neon) en producción y **SQLite** en local.
- Librerías del backend: `express`, `pg`, `bcryptjs`, `jsonwebtoken`, `dotenv`, `helmet` y `express-rate-limit`.

## Estructura

```
frontend/                  Página web (React)
  index.html               HTML base donde se monta React
  src/
    main.jsx, App.jsx      Arranque y elección de pantalla (tienda, login o panel)
    paginas/               Tienda, AdminLogin y AdminPanel
    componentes/           Encabezado, Inicio, Catálogo, Pedido, Contacto, Recomendador...
    componentes/admin/     Formulario y tablas del panel
    assets/productos/      Fotos de cada producto (JPG)
    recomendador.js        Reglas del recomendador (las usa también el backend)
    api.js                 Llamadas al backend y manejo de Render dormido
    rutas.js               Enlaces que funcionan en Netlify y en GitHub Pages
    styles.css             Estilos
src/                       Backend (Express)
  server.js                Arranque, seguridad, CORS y rutas
  rutas/                   contacto, recomendador, adminLogin, adminGestion
  middleware/              requiereAdmin (JWT), limitadores, registroPeticiones
  data/                    baseDatos (conexión), productos, solicitudes, productos.json
  scripts/                 iniciar-bd, generar-hash, prueba-rapida, revisar-sintaxis...
.github/workflows/pages.yml  Publica la página en GitHub Pages
netlify.toml · render.yaml   Configuración de Netlify y Render
```

## Ejecutar en el computador

Necesitas **Node.js 22.13 o superior**. En Windows, si PowerShell bloquea `npm`, usa `npm.cmd`.

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Crea tu archivo `.env` a partir del ejemplo (en Windows: `copy .env.example .env`):
   ```bash
   cp .env.example .env
   ```
3. Genera el hash de la contraseña del admin y pégalo en `ADMIN_PASSWORD_HASH` del `.env`. Pon también un `JWT_SECRET` largo y aleatorio:
   ```bash
   npm run admin:hash
   ```
4. En una terminal, arranca el backend en http://localhost:3000. Si `DATABASE_URL` está vacía, usa SQLite y crea las tablas solo:
   ```bash
   npm run dev
   ```
5. En otra terminal, arranca la página en http://localhost:5173:
   ```bash
   npm run dev:frontend
   ```

El panel está en http://localhost:5173/admin/login.

### Comandos útiles

| Comando | Para qué sirve |
|---|---|
| `npm run check` | Revisa la sintaxis del backend y el catálogo de respaldo, y compila React |
| `npm run test:smoke` | Prueba rápida del backend con una base temporal |
| `npm run build` | Compila la página en `dist/` |
| `npm start` | Arranca el servidor (como en Render) |
| `npm run catalogo:sync` | Copia `src/data/productos.json` al catálogo de respaldo del frontend |
| `npm run db:init` | Crea las tablas sin arrancar el servidor |

## Variables de entorno

Están explicadas en [`.env.example`](./.env.example). **Nunca subas el archivo `.env` a GitHub.** En Render se configuran en *Environment*:

- `ADMIN_USER` y `ADMIN_PASSWORD_HASH`: usuario del panel y hash bcrypt de su contraseña.
- `JWT_SECRET`: clave para firmar los tokens (Render la puede generar).
- `DATABASE_URL`: dirección de Neon (empieza por `postgresql://`).
- `FRONTEND_ORIGIN`, `GITHUB_PAGES_ORIGIN` y `CORS_ORIGINS`: sitios que pueden usar la API.

## API

| Método y ruta | Qué hace | ¿Pide login? |
|---|---|---|
| `GET /api/health` | Dice si el servidor y la base están bien | No |
| `GET /api/productos` | Lista el catálogo | No |
| `POST /api/contacto` | Guarda un mensaje del formulario | No |
| `POST /api/recomendaciones` | Recomienda un producto (sabor, tamaño, ocasión) | No |
| `POST /api/admin/login` | Devuelve un token JWT válido por 8 horas | No |
| `GET/POST/PATCH/DELETE /api/admin/productos` | Gestiona productos | Sí |
| `GET/PATCH/DELETE /api/admin/solicitudes` | Gestiona solicitudes | Sí |

## Publicación

- **Netlify** compila con `npm run build` y publica `dist/` (ver `netlify.toml`).
- **GitHub Pages**: el workflow `.github/workflows/pages.yml` compila y publica en cada push a `main`.
  Debe estar activado en *Settings → Pages → Source: GitHub Actions*.
- **Render** (plan Free) ejecuta el backend con `npm start` (ver `render.yaml`). Si nadie lo usa durante 15 minutos se duerme. La página lo despierta sola y muestra "Conectando con el servidor...".
- **Neon** guarda los datos en PostgreSQL. Las tablas se crean solas al arrancar.

## Imágenes

Las fotos de `frontend/src/assets/productos/` son recortes de nuestro afiche promocional, en formato JPG de 800 × 600 px.
Para cambiar una foto, reemplaza el archivo manteniendo el mismo nombre (`micheman.jpg`, `premium.jpg`, `explosivo.jpg` o `mini.jpg`).
