
require("dotenv").config();

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const { leerProductos } = require("./data/productos");
const { consulta, inicializarAlmacenamiento, cerrarAlmacenamiento, modoAlmacenamiento } = require("./data/baseDatos");
const registroPeticiones = require("./middleware/registroPeticiones");
const contactoRouter = require("./rutas/contacto");
const recomendadorRouter = require("./rutas/recomendador");
const adminLoginRouter = require("./rutas/adminLogin");
const adminGestionRouter = require("./rutas/adminGestion");

const app = express();
const PUERTO = process.env.PORT || 3000;
const CARPETA_FRONTEND = path.join(__dirname, "..", "dist"); 


const ADMIN_USER = process.env.ADMIN_USER || process.env.ADMIN_USERNAME;
if (!ADMIN_USER || !/^\$2[aby]\$\d{2}\$/.test(process.env.ADMIN_PASSWORD_HASH || "")) {
  throw new Error("Configura ADMIN_USER y ADMIN_PASSWORD_HASH (un hash bcrypt) en el entorno.");
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET debe tener al menos 32 caracteres.");
}
if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  throw new Error("Configura DATABASE_URL en producción para conservar solicitudes y productos.");
}


const ORIGENES_PERMITIDOS = new Set([
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5173", // Vite en desarrollo
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_ORIGIN, // Netlify
  process.env.GITHUB_PAGES_ORIGIN, // GitHub Pages
  ...(process.env.CORS_ORIGINS || "").split(",").map((origen) => origen.trim()),
].filter(Boolean));


if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// 3) Middlewares: se ejecutan en orden para cada petición.
app.use(registroPeticiones); // registra método, ruta, estado y duración
app.use(helmet({ // cabeceras de seguridad HTTP
  contentSecurityPolicy: {
    directives: {
      connectSrc: ["'self'", ...ORIGENES_PERMITIDOS],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  },
}));

app.use((req, res, next) => {
  const origen = req.get("Origin");
  if (!origen) return next(); // peticiones sin navegador (curl, Render) no envían Origin
  if (!ORIGENES_PERMITIDOS.has(origen)) {
    return res.status(403).json({ error: "Este origen no tiene permiso para usar la API." });
  }
  res.setHeader("Access-Control-Allow-Origin", origen);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key, Authorization");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") return res.sendStatus(204); // respuesta a la "pregunta previa" del navegador
  return next();
});

app.use(express.static(CARPETA_FRONTEND));
app.use(express.json({ limit: "10kb" })); // leemos JSON pequeños (formularios)

// 4) Rutas de la API.
app.use("/api", contactoRouter);
app.use("/api", recomendadorRouter);
app.use("/api/admin", adminLoginRouter);
app.use("/api/admin", adminGestionRouter);

// Prueba de salud: el frontend la usa para saber si Render ya despertó.
app.get("/api/health", async (req, res) => {
  try {
    await consulta("SELECT 1 AS ok");
    return res.json({ status: "ok", storage: modoAlmacenamiento(), database: "connected" });
  } catch (error) {
    console.error("La comprobación de salud no pudo acceder a la base de datos.", error.code || error.name);
    return res.status(503).json({
      status: "unavailable",
      storage: modoAlmacenamiento(),
      database: "unavailable",
      error: "La base de datos no está disponible. Inténtalo de nuevo en un momento.",
    });
  }
});

// Catálogo público.
app.get("/api/productos", async (req, res) => {
  try {
    return res.json(await leerProductos());
  } catch (error) {
    console.error("No se pudo cargar el catálogo.", error.code || error.name);
    return res.status(500).json({ error: "No se pudo cargar el catálogo en este momento." });
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "La ruta de la API no existe." });
});

// Cualquier otra página (/, /admin, /admin/login) la resuelve React: enviamos index.html.
app.get(/.*/, (req, res, next) => {
  res.sendFile(path.join(CARPETA_FRONTEND, "index.html"), (error) => {
    if (error) next(error);
  });
});

// 5) Manejo de errores: respondemos un mensaje claro sin mostrar detalles internos.
app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Los datos enviados no tienen formato JSON válido." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "Los datos enviados superan el tamaño permitido." });
  }
  console.error(JSON.stringify({ requestId: req.requestId, event: "request_error", code: error.code || error.name }));
  const esErrorDelCliente = error.status >= 400 && error.status < 500;
  return res.status(esErrorDelCliente ? error.status : 500).json({
    error: esErrorDelCliente ? "No se pudo procesar la solicitud." : "Ocurrió un error inesperado en el servidor.",
    requestId: req.requestId,
  });
});

// 6) Arranque: primero preparamos la base de datos y luego escuchamos en el puerto.
if (require.main === module) {
  inicializarAlmacenamiento()
    .then(() => {
      const servidor = app.listen(PUERTO, () => {
        console.log(`MicheMango está disponible en el puerto ${PUERTO} (almacenamiento: ${modoAlmacenamiento()})`);
      });

      // Al apagar (Ctrl+C o Render), cerramos el servidor y la base de datos con orden.
      const cerrar = () => servidor.close(() => cerrarAlmacenamiento().catch(() => { process.exitCode = 1; }));
      process.once("SIGINT", cerrar);
      process.once("SIGTERM", cerrar);
    })
    .catch((error) => {
      console.error("No se pudo iniciar MicheMango:", error.code || error.name);
      cerrarAlmacenamiento().catch(() => {});
      process.exitCode = 1;
    });
}

// Exportamos la app para que las pruebas puedan usarla sin abrir otro proceso.
module.exports = app;
