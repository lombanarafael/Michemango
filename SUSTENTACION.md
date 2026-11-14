# Guía para la sustentación — MicheMango

Guía de estudio para explicar el proyecto con mis propias palabras.

---

## 1. Resumen en 5 líneas

1. MicheMango es la tienda web de un emprendimiento de miches de mango en Barranquilla.
2. La página está hecha con **HTML, CSS, JavaScript y React**, y se publica en **Netlify** y en **GitHub Pages**.
3. El backend es **Node.js + Express**, publicado en **Render**, y guarda los datos en **PostgreSQL (Neon)**.
4. El cliente ve el catálogo, arma su pedido para WhatsApp, envía mensajes y recibe recomendaciones.
5. El dueño entra a un **panel con login** para gestionar productos y solicitudes.

### Cómo cumple cada punto del curso

| Punto del curso | Cómo lo cumple | Dónde está |
|---|---|---|
| 01 Landing / inicio | Marca, mensaje, secciones y menú | `frontend/src/componentes/Inicio.jsx`, `Encabezado.jsx`, `Nosotros.jsx` |
| 02 Catálogo | Ilustración, categoría, descripción, precio, filtros y cantidad | `Catalogo.jsx`, `TarjetaProducto.jsx` |
| 03 Contacto real | El formulario guarda en la base de datos | `Contacto.jsx` → `POST /api/contacto` → tabla `michemango_requests` |
| 04 Panel admin | Login con contraseña cifrada + gestión de productos y solicitudes | `paginas/AdminLogin.jsx`, `paginas/AdminPanel.jsx` |
| 05 IA aplicada | Recomendador por reglas que sugiere un producto y explica por qué | `frontend/src/recomendador.js`, `Recomendador.jsx` |
| 06 Publicación | Netlify + GitHub Pages (página), Render (API) y Neon (datos) | `netlify.toml`, `.github/workflows/pages.yml`, `render.yaml` |
| Git, 15+ commits | Más de 50 commits | `git log --oneline` |
| GitHub | Repositorio `lombanarafael/Michemango` | — |
| GitHub Pages | Se publica sola con GitHub Actions | `.github/workflows/pages.yml` |
| Responsive | `meta viewport`, `@media (max-width: 600px)`, grillas flexibles | `frontend/src/styles.css` |
| Solo librerías de animación | En la página no hay librerías extra: la animación es JavaScript propio (`IntersectionObserver`) | `paginas/Tienda.jsx` |

---

## 2. Diagrama del flujo

```
 Usuario (celular o computador)
     │  abre la página
     ▼
 Página web  (HTML + CSS + JavaScript + React)     ← Netlify / GitHub Pages
     │  fetch("https://michemango-api.onrender.com/api/...")  (JSON)
     ▼
 Backend  Node.js + Express                        ← Render
     │  helmet → CORS → límite de peticiones → ruta → validación
     │  SQL con parámetros ($1, $2...)
     ▼
 PostgreSQL                                        ← Neon
     tablas: michemango_products, michemango_requests

 Recomendador (reglas con puntos)
     corre en el navegador con los productos que ya cargó la página
     (el backend también lo ofrece en POST /api/recomendaciones, con la misma regla)
```

---

## 3. Mapa de carpetas y archivos

**Frontend (`frontend/`)**

| Archivo | Qué hace |
|---|---|
| `index.html` | HTML base con el `<div id="root">` donde React dibuja todo |
| `src/main.jsx` | Arranca React y monta `App` |
| `src/App.jsx` | Según la dirección, muestra la tienda, el login o el panel |
| `src/paginas/Tienda.jsx` | Página principal; guarda los productos, el pedido y si el recomendador está abierto |
| `src/componentes/*.jsx` | Una sección por archivo: Encabezado, Inicio, Nosotros, Catálogo, Pedido, Contacto, Recomendador... |
| `src/componentes/ImagenProducto.jsx` | Convierte la clave guardada (por ejemplo `premium`) en la ilustración |
| `src/paginas/AdminLogin.jsx` | Formulario de ingreso del admin |
| `src/paginas/AdminPanel.jsx` | Panel: carga, crea, edita y borra datos usando el token |
| `src/recomendador.js` | Las reglas del recomendador |
| `src/api.js` | Funciones para llamar al backend y despertar a Render |
| `src/rutas.js` | Arma enlaces que funcionan en Netlify (`/`) y en Pages (`/Michemango/`) |
| `src/styles.css` | Todos los estilos y el responsive |
| `src/data/catalogo-respaldo.json` | Copia del catálogo para mostrar productos aunque el backend duerma |

**Backend (`src/`)**

| Archivo | Qué hace |
|---|---|
| `server.js` | Revisa variables, configura seguridad y CORS, conecta rutas y arranca |
| `rutas/contacto.js` | Recibe y valida el formulario, y lo guarda |
| `rutas/adminLogin.js` | Revisa usuario y contraseña con bcrypt y entrega el JWT |
| `rutas/adminGestion.js` | CRUD de productos y solicitudes (protegido) |
| `rutas/recomendador.js` | API del recomendador |
| `middleware/requiereAdmin.js` | Crea y verifica el token JWT |
| `middleware/limitadores.js` | Límite de intentos por IP |
| `middleware/registroPeticiones.js` | Escribe cada petición en los logs |
| `data/baseDatos.js` | Conexión a PostgreSQL o SQLite, la función `consulta()` y la creación de tablas |
| `data/productos.js`, `data/solicitudes.js` | Consultas SQL de cada tabla |
| `data/productos.json` | Los 4 productos iniciales |
| `scripts/prueba-rapida.js` | Pruebas automáticas (`npm run test:smoke`) |
| `scripts/generar-hash.js` | Genera el hash bcrypt de la contraseña del admin |

---

## 4. Recorrido de un mensaje de contacto

1. **El usuario llena el formulario** en `Contacto.jsx` y presiona "Enviar mensaje".
2. **`enviarFormulario()`** (`Contacto.jsx`, línea ~15) revisa que haya un teléfono o un correo (`setCustomValidity`) y desactiva el botón.
3. Llama a **`apiFetchConDespertar("/api/contacto", ...)`** (`api.js`, línea ~73).
   - Si Render está dormido, `despertarServidor()` pregunta a `/api/health` cada 5 segundos, hasta 12 veces.
   - Mientras tanto, la página muestra "Conectando con el servidor...".
4. Se envía un `POST` con JSON y la cabecera **`Idempotency-Key`** (un id único del mensaje).
5. En el servidor (`server.js`), la petición pasa por `registroPeticiones` → `helmet` → **CORS** → `express.json()`.
6. Llega a **`router.post("/contacto")`** en `rutas/contacto.js` (línea ~37):
   - `limitarSolicitudes` permite máximo 5 mensajes cada 15 minutos por IP.
   - `limpiarTexto()` y `esTelefonoValido()` limpian y validan nombre, correo, teléfono y mensaje.
   - El id de la solicitud es la `Idempotency-Key` o un `randomUUID()`.
7. **`guardarSolicitud()`** (`data/solicitudes.js`, línea ~17) hace un `INSERT ... ON CONFLICT (id) DO NOTHING` usando `consulta()` de `baseDatos.js`.
8. El servidor responde **201** con "¡Gracias! Registramos tu solicitud..." y la página lo muestra en verde.
9. El admin lo ve en el panel: `AdminPanel.jsx` → `GET /api/admin/solicitudes` → `leerSolicitudes()`.

---

## 5. Cómo funciona el login del admin

1. **La contraseña no está guardada en ningún archivo.** En Render solo está su **hash bcrypt** (`ADMIN_PASSWORD_HASH`). Un hash es una "huella" que no se puede volver a convertir en la contraseña. Se genera con `npm run admin:hash`.
2. En `AdminLogin.jsx`, el admin escribe usuario y contraseña y se envían a `POST /api/admin/login`.
3. En `rutas/adminLogin.js` (línea ~21), **`bcrypt.compare()`** calcula el hash de lo que escribió y lo compara con el guardado. Además, `limitarLogin` solo permite 5 intentos cada 15 minutos.
4. Si es correcto, **`crearTokenAdmin()`** (`middleware/requiereAdmin.js`, línea ~6) crea un **JWT** firmado con `JWT_SECRET`, que **dura 8 horas** (`expiresIn: "8h"`).
5. La página guarda el token en **`localStorage`** del navegador (`michemango.adminToken`).
6. Cada petición del panel envía la cabecera `Authorization: Bearer <token>`.
7. En el backend, **`requiereAdminApi`** (`requiereAdmin.js`, línea ~16) verifica la firma con `jwt.verify()`. Si el token falta, es falso o venció, responde **401** y la página manda al login. Todas las rutas de `adminGestion.js` pasan por ahí (`router.use(requiereAdminApi)`, línea ~20).
8. "Cerrar sesión" borra el token del `localStorage`.

---

## 6. Cómo funciona el recomendador (y por qué es "IA")

**Lo digo con honestidad:** es un **sistema por reglas con puntos** (lo que se conoce como IA clásica o sistema experto). **No es un modelo generativo** como ChatGPT, no aprende solo y no llama a servicios externos.

Así funciona (`frontend/src/recomendador.js`):
1. La persona elige **sabor**, **tamaño** y **ocasión**.
2. A cada producto se le dan puntos buscando palabras clave en su nombre, categoría y descripción. Por ejemplo:
   - Pidió picante y el producto tiene "chamoy" o "tajín": **+4**.
   - Pidió pequeño y el producto es "mini": **+4**; si no lo es: **−1**.
   - Es para celebrar y el producto es grande (premium o explosivo): **+3**.
3. Gana el que más puntos sume. Si hay empate, gana el más barato.
4. Cada regla que suma guarda una **razón**, y se muestra: *"Te lo recomendamos porque tiene chamoy y tajín para el picante, es una porción grande y rinde para compartir."*

**Qué necesidad real resuelve:** muchos clientes no saben cuál pedir. El recomendador los guía en segundos y les deja agregar la sugerencia al pedido con un clic. Funciona en el navegador, así que responde al instante aunque el servidor esté dormido, y no cuesta dinero.

---

## 7. Conceptos en palabras simples

- **Variables de entorno (`.env`)**: datos secretos o que cambian según dónde corre el proyecto (contraseña en hash, clave del JWT, dirección de la base). Van en `.env` en el computador y en el panel de Render en producción. **El `.env` no se sube a GitHub** (está en `.gitignore`). Solo se sube `.env.example`, con valores de ejemplo.
- **CORS**: el navegador solo deja que una página llame a otro dominio si ese servidor lo autoriza. El backend tiene una lista (`ORIGENES_PERMITIDOS` en `server.js`) con Netlify, GitHub Pages y localhost. Cualquier otro sitio recibe **403**.
- **helmet**: agrega cabeceras de seguridad HTTP a cada respuesta, por ejemplo para limitar de dónde se cargan scripts y evitar que la página se meta en un iframe ajeno.
- **Límite de peticiones (`express-rate-limit`)**: cuenta cuántas veces llama una IP. Login: 5 intentos cada 15 minutos (contra quien intenta adivinar contraseñas). Contacto: 5 mensajes cada 15 minutos (contra el spam).
- **Idempotency-Key**: un id único por mensaje. Si el internet falla y el navegador reenvía el mismo mensaje, el servidor ve que el id ya existe y **no lo guarda dos veces**.
- **Render Free "se duerme"**: en el plan gratis, si nadie usa el servidor durante 15 minutos, Render lo apaga, y al volver a usarlo tarda cerca de un minuto en encender. La página lo maneja así:
  - Muestra el catálogo de respaldo al instante.
  - El recomendador funciona en el navegador.
  - Al enviar el formulario o hacer login, pregunta a `/api/health` cada 5 segundos hasta que responda, mostrando "Conectando con el servidor...".

---

## 8. ¿Por qué esa forma de publicar y esa base de datos?

- **Página en Netlify y GitHub Pages**: son *hosting estático*, es decir, solo entregan archivos (HTML, CSS, JS). Son gratis y rápidos. GitHub Pages lo pide el curso; Netlify es una segunda copia.
- **Backend en Render**: Netlify y Pages **no ejecutan Node.js**. El backend necesita un servidor que esté corriendo para recibir formularios, validar el login y hablar con la base. Render lo ofrece gratis.
- **PostgreSQL en Neon**: es una base **relacional** (datos en **tablas** con columnas y tipos, como una hoja de cálculo con reglas). Tenemos dos tablas: `michemango_products` y `michemango_requests`. Las reglas (`NOT NULL`, `CHECK (precio > 0)`, `PRIMARY KEY`) evitan datos malos. Neon da PostgreSQL gratis y sin vencimiento; la base gratuita de Render se borra a los 30 días.
- **SQLite en el computador**: para programar sin internet. Es un archivo de base de datos que viene con Node 22. La función `consulta()` de `baseDatos.js` hace que el mismo SQL sirva para las dos.

---

## 9. Git, commits y despliegue

- **Git** guarda el historial de cambios del código. Cada **commit** es una "foto" del proyecto con un mensaje que dice qué cambió. **GitHub** guarda ese historial en internet.
- El proyecto tiene **más de 50 commits**. Los primeros armaron la página en HTML/CSS/JS; luego vinieron el backend, la base de datos, el login, el paso a React, y al final la organización para la sustentación:
  - dividir en componentes;
  - ilustraciones de los productos;
  - GitHub Pages;
  - simplificar la base de datos;
  - nombres en español;
  - recomendador con explicación;
  - documentación.
- **Despliegue:** al hacer `git push` a `main`:
  1. **Netlify** ejecuta `npm run build` y publica `dist/`.
  2. **GitHub Actions** ejecuta el workflow `pages.yml` y publica en GitHub Pages.
  3. **Render** instala, compila y reinicia el backend (`npm start`). Al arrancar, crea las tablas si faltan.

---

## 10. Preguntas probables del jurado

1. **¿Lo hizo la IA?**
   Usamos un asistente de IA (Claude) como apoyo, como permite el curso: para ordenar el código, encontrar errores y dibujar las ilustraciones en SVG. Las decisiones, el contenido del negocio y las pruebas las hicimos nosotros, y podemos explicar cada parte. Por eso dividimos el código en archivos pequeños y con comentarios.
2. **¿Por qué React?**
   Porque es lo que vimos en el bloque de octubre. Nos deja dividir la página en **componentes** reutilizables, por ejemplo `TarjetaProducto` se usa una vez por producto. Con `useState`, la pantalla se actualiza sola cuando cambian los datos, como el total del pedido.
3. **¿Qué es un componente, una prop y `useState`?**
   - Un componente es una función que devuelve HTML (JSX).
   - Las props son los datos que recibe, por ejemplo `producto`.
   - `useState` guarda un dato que, al cambiar, vuelve a dibujar el componente.
4. **¿Y `useEffect`?**
   Ejecuta algo después de dibujar. Por ejemplo, en `Tienda.jsx` pide el catálogo al backend una sola vez, al cargar.
5. **¿Cómo proteges la contraseña del admin?**
   No se guarda la contraseña, solo su hash bcrypt en una variable de entorno. Al entrar se compara con `bcrypt.compare`. Además, el login solo permite 5 intentos cada 15 minutos.
6. **¿Qué es el JWT y cuánto dura?**
   Un token firmado con una clave secreta del servidor. Dura 8 horas, se guarda en `localStorage` y se envía en la cabecera `Authorization`. Si alguien lo modifica, la firma no coincide y el servidor lo rechaza.
7. **¿Qué pasa si la base de datos falla?**
   - `/api/health` responde 503.
   - El formulario muestra un mensaje de error en vez de quedarse colgado.
   - La tienda sigue mostrando el catálogo de respaldo y se puede pedir por WhatsApp.
   - Los datos que ya estaban en Neon no se pierden.
8. **¿Qué pasa si Render está dormido?**
   La página espera hasta un minuto preguntando a `/api/health` y avisa "Conectando con el servidor...". El catálogo y el recomendador funcionan sin esperar.
9. **¿Cómo evitas la inyección SQL?**
   Los valores nunca se pegan dentro del SQL: van aparte, como parámetros (`$1`, `$2`), y la base los trata como datos.
10. **¿Por qué PostgreSQL y no MongoDB?**
    Nuestros datos tienen forma fija (productos y solicitudes con las mismas columnas). Una base relacional con reglas (`CHECK`, `NOT NULL`) los mantiene ordenados. Además, Neon es gratis.
11. **¿Por qué el recomendador es "IA" si son reglas?**
    Es IA clásica: un sistema que toma decisiones a partir de reglas definidas por expertos (nosotros conocemos los productos). No es generativa, y lo decimos así. Resuelve una necesidad real: ayudar a elegir.
12. **¿Cómo es responsive?**
    Usamos `meta viewport`, grillas con `flex-wrap` y `minmax`, y `@media (max-width: 600px)` para el menú y las columnas en celular. Lo probamos en 320, 375, 768 y 1280 px.
13. **¿Qué validas en el formulario?**
    Se valida en el navegador (`required`, `maxLength`, `type="email"`) y **otra vez en el servidor**, porque las validaciones del navegador se pueden saltar. Se revisan el nombre, que haya teléfono o correo, el formato del correo, que el teléfono tenga de 7 a 15 dígitos y que el mensaje tenga máximo 1000 caracteres.
14. **¿Qué es CORS y por qué lo necesitas?**
    La página (Netlify) y la API (Render) están en dominios distintos. CORS es el permiso que da el servidor para que el navegador deje hacer esas llamadas, y solo se lo damos a nuestros sitios.
15. **¿Qué harías para mejorarlo?**
    - Fotos reales de los productos.
    - Pagos en línea.
    - Que el admin reciba un correo cuando llega un mensaje.
    - Varios usuarios admin guardados en la base.
    - Un chatbot con un modelo de lenguaje para preguntas frecuentes.
    - Más pruebas automáticas del frontend.

---

## 11. Las 5 partes del código que debo estudiar a fondo

| # | Qué | Archivo y líneas aproximadas |
|---|---|---|
| 1 | Formulario de contacto: del clic al `INSERT` | `frontend/src/componentes/Contacto.jsx` (15–60) → `src/rutas/contacto.js` (37–150) → `src/data/solicitudes.js` (17–38) |
| 2 | Login y protección con JWT | `src/rutas/adminLogin.js` (11–35) y `src/middleware/requiereAdmin.js` (6–40) |
| 3 | Recomendador por reglas | `frontend/src/recomendador.js` (7–60) |
| 4 | Estado de la tienda con React (`useState`, `useEffect`, props) | `frontend/src/paginas/Tienda.jsx` (16–110) |
| 5 | Servidor y base de datos: orden de middlewares, CORS y `consulta()` | `src/server.js` (20–110) y `src/data/baseDatos.js` (45–120) |

---

## 12. Guía de demo de 5 minutos

1. **(30 s) Presentación**: qué es MicheMango y qué problema resuelve. Abrir https://michemango.netlify.app.
2. **(45 s) Inicio y catálogo**: mostrar la marca, el menú, las secciones, las ilustraciones, los filtros por categoría y el subtotal según la cantidad.
3. **(45 s) Recomendador**: "Ayúdame a elegir" → picante, grande, compartir → leer la explicación → "Agregar al pedido".
4. **(30 s) Pedido**: mostrar el resumen y el total → "Preparar pedido en WhatsApp" (se abre el mensaje armado).
5. **(45 s) Contacto**: enviar un mensaje real y mostrar el aviso de éxito.
6. **(60 s) Panel admin**: ir a `/admin/login` → entrar → ver el mensaje recién enviado → cambiar su estado a "atendida" → editar el precio de un producto → volver a la tienda y ver el cambio.
7. **(30 s) Responsive**: abrir las herramientas del navegador (F12) en modo celular y mostrar el menú.
8. **(15 s) Cierre**: mostrar el repositorio en GitHub, los commits y GitHub Pages.

**Consejo:** 10 minutos antes de la defensa, abre https://michemango-api.onrender.com/api/health para despertar a Render y que la demo no espere.
