// Cargamos la configuración privada del archivo .env antes de iniciar Express.
require("dotenv").config();

// Importamos Express, las rutas y la fuente de datos del catálogo.
const express = require("express");
const { leerProductos } = require("./productos");
const {
  pool,
  sqlite,
  inicializarAlmacenamiento,
  cerrarAlmacenamiento,
  modoAlmacenamiento,
} = require("./data/storage");
const contactoRouter = require("./routes/contacto");
const adminRouter = require("./routes/admin");
const adminAuthRouter = require("./routes/adminAuth");
const adminApiRouter = require("./routes/adminApi");
const recomendadorRouter = require("./routes/recomendador");
const helmet = require("helmet");
const path = require("path");
const requestLogger = require("./middleware/requestLogger");

// Creamos la aplicación y ubicamos la compilación de React.
const app = express();
const PUERTO = process.env.PORT || 3000;
const CARPETA_PUBLICA = path.join(__dirname, "..", "dist");
const origenesLocales = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
const sitiosPublicados = [
  process.env.FRONTEND_ORIGIN,
  process.env.GITHUB_PAGES_ORIGIN,
].filter(Boolean);
const origenesCORS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);
const origenesPermitidos = new Set([...origenesLocales, ...origenesCORS]);

// Evitamos iniciar el panel si faltan sus credenciales o la clave para firmar tokens.
if (!(process.env.ADMIN_USERNAME || process.env.ADMIN_USER) || !process.env.ADMIN_PASSWORD_HASH) {
  throw new Error("Configura ADMIN_USER (o ADMIN_USERNAME) y ADMIN_PASSWORD_HASH en el entorno.");
}

if (!/^\$2[aby]\$\d{2}\$/.test(process.env.ADMIN_PASSWORD_HASH)) {
  throw new Error("ADMIN_PASSWORD_HASH debe contener un hash bcrypt válido.");
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET debe tener al menos 32 caracteres.");
}

if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  throw new Error("Configura DATABASE_URL en producción para conservar solicitudes y productos.");
}

if (process.env.NODE_ENV === "production" && (!process.env.FRONTEND_ORIGIN || !process.env.GITHUB_PAGES_ORIGIN)) {
  throw new Error("Configura FRONTEND_ORIGIN y GITHUB_PAGES_ORIGIN en producción.");
}

sitiosPublicados.forEach((origen) => {
  let url;
  try {
    url = new URL(origen);
  } catch {
    throw new Error("FRONTEND_ORIGIN y GITHUB_PAGES_ORIGIN deben ser direcciones HTTPS válidas.");
  }
  if (
    url.origin !== origen ||
    (process.env.NODE_ENV === "production" && url.protocol !== "https:")
  ) {
    throw new Error("Los sitios publicados deben ser orígenes exactos, sin ruta ni barra final.");
  }
});

origenesCORS.forEach((origen) => {
  let url;
  try {
    url = new URL(origen);
  } catch {
    throw new Error(`CORS_ORIGINS contiene un origen inválido: ${origen}`);
  }

  const esLocal = origenesLocales.includes(origen);
  const esSitioPublicado = sitiosPublicados.includes(origen);
  if (!esLocal && !esSitioPublicado) {
    throw new Error(`CORS_ORIGINS solo puede incluir los sitios publicados y localhost: ${origen}`);
  }
  if (
    url.origin !== origen ||
    !["http:", "https:"].includes(url.protocol) ||
    (process.env.NODE_ENV === "production" && !esLocal && url.protocol !== "https:")
  ) {
    throw new Error(`Cada origen CORS debe ser exacto y no llevar barra final: ${origen}`);
  }
});

if (process.env.NODE_ENV === "production" && sitiosPublicados.some((origen) => !origenesPermitidos.has(origen))) {
  throw new Error("CORS_ORIGINS debe incluir Netlify y GitHub Pages.");
}

// Si hay un proxy HTTPS al desplegar, Express podrá reconocer la conexión segura.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Añadimos cabeceras de seguridad y un registro sencillo de peticiones.
app.use(requestLogger);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      connectSrc: ["'self'", ...origenesPermitidos],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  },
}));

// Solo permitimos el sitio publicado y los orígenes locales de desarrollo.
app.use((req, res, next) => {
  const origen = req.get("Origin");

  if (!origen) {
    return next();
  }

  if (!origenesPermitidos.has(origen)) {
    return res.status(403).json({ error: "Este origen no tiene permiso para usar la API." });
  }
  res.setHeader("Access-Control-Allow-Origin", origen);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key, Authorization");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

// Servimos el frontend para pruebas locales y las vistas administrativas estáticas.
app.use(express.static(CARPETA_PUBLICA));

// Permitimos recibir datos JSON para el formulario y el inicio de sesión.
app.use(express.json({ limit: "10kb" }));

// Conectamos las rutas del formulario, acceso y administración.
app.use("/api", contactoRouter);
app.use("/api", recomendadorRouter);
app.use("/api/admin", adminAuthRouter);
app.use("/admin", adminRouter);
app.use("/api/admin", adminApiRouter);

app.get("/api/health", async (req, res) => {
  try {
    if (pool) {
      await pool.query("SELECT 1");
    } else if (modoAlmacenamiento() === "sqlite-local") {
      sqlite.prepare("SELECT 1 AS ok").get();
    } else {
      return res.status(503).json({
        status: "unavailable",
        storage: "unavailable",
        database: "unavailable",
        error: "La base de datos no está configurada.",
      });
    }

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

// Conservamos la ruta del catálogo disponible desde el primer servidor.
app.get("/api/productos", async (req, res) => {
  try {
    return res.json(await leerProductos());
  } catch (error) {
    console.error("No se pudo cargar el catálogo:", error.message);
    return res.status(500).json({ error: "No se pudo cargar el catálogo en este momento." });
  }
});

// Contestamos con JSON cuando se solicita una ruta de API que no existe.
app.use("/api", (req, res) => {
  res.status(404).json({ error: "La ruta de la API no existe." });
});

app.use((req, res, next) => {
  if (req.method !== "GET") {
    return next();
  }
  return res.sendFile(path.join(CARPETA_PUBLICA, "index.html"), (error) => {
    if (error) next(error);
  });
});

// Informamos claramente si el cuerpo JSON enviado por el navegador no se puede leer.
app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Los datos enviados no tienen formato JSON válido." });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "Los datos enviados superan el tamaño permitido." });
  }

  console.error(JSON.stringify({
    requestId: req.requestId,
    event: "request_error",
    code: error.code || "INTERNAL_ERROR",
    name: error.name || "Error",
  }));
  return res.status(error.status >= 400 && error.status < 500 ? error.status : 500).json({
    error: error.status >= 400 && error.status < 500
      ? "No se pudo procesar la solicitud."
      : "Ocurrió un error inesperado en el servidor.",
    requestId: req.requestId,
  });
});

// Al iniciar este archivo directamente, dejamos al servidor escuchando en el puerto.
if (require.main === module) {
  inicializarAlmacenamiento()
    .then(() => {
      const servidor = app.listen(PUERTO, () => {
        console.log(`MicheMango está disponible en el puerto ${PUERTO} (almacenamiento: ${modoAlmacenamiento()})`);
      });

      let cerrando = false;
      const cerrarServidor = (senal) => {
        if (cerrando) {
          return;
        }
        cerrando = true;
        console.log(`Cerrando MicheMango (${senal})...`);

        servidor.close((error) => {
          if (error) {
            console.error("No se pudo cerrar el servidor HTTP correctamente.");
            process.exitCode = 1;
          }

          cerrarAlmacenamiento().catch((closeError) => {
            console.error("No se pudo cerrar el almacenamiento correctamente.", closeError.code || closeError.name);
            process.exitCode = 1;
          });
        });
      };

      process.once("SIGINT", () => cerrarServidor("SIGINT"));
      process.once("SIGTERM", () => cerrarServidor("SIGTERM"));
    })
    .catch((error) => {
      console.error("No se pudo iniciar MicheMango:", error.code || error.name);
      cerrarAlmacenamiento().catch((closeError) => {
        console.error("No se pudo cerrar el almacenamiento.", closeError.code || closeError.name);
      });
      process.exitCode = 1;
    });
}

// Exportamos la aplicación para poder probar sus rutas sin iniciar otro servidor.
module.exports = app;
