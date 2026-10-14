// Cargamos la configuración privada del archivo .env antes de iniciar Express.
require("dotenv").config();

// Importamos Express, las rutas y la fuente de datos del catálogo.
const express = require("express");
const { leerProductos } = require("./productos");
const { pool, inicializarAlmacenamiento, modoAlmacenamiento } = require("./data/storage");
const contactoRouter = require("./routes/contacto");
const adminRouter = require("./routes/admin");
const adminApiRouter = require("./routes/adminApi");
const path = require("path");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");

// Creamos la aplicación y ubicamos la carpeta pública del sitio.
const app = express();
const PUERTO = process.env.PORT || 3000;
const CARPETA_PUBLICA = path.join(__dirname, "..", "public");
const origenesPermitidos = new Set();
const origenesConfigurados = (
  process.env.CORS_ORIGINS ||
  "http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000,http://127.0.0.1:3000"
)
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);

// Evitamos iniciar el panel con credenciales o secreto de sesión sin configurar.
if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH) {
  throw new Error("Configura ADMIN_USERNAME y ADMIN_PASSWORD_HASH en el archivo .env.");
}

if (!/^\$2[aby]\$\d{2}\$/.test(process.env.ADMIN_PASSWORD_HASH)) {
  throw new Error("ADMIN_PASSWORD_HASH debe contener un hash bcrypt válido.");
}

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET en .env debe tener al menos 32 caracteres.");
}

if (process.env.NODE_ENV === "production" && !process.env.CORS_ORIGINS) {
  throw new Error("Configura CORS_ORIGINS con el origen público del frontend en producción.");
}

if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  throw new Error("Configura DATABASE_URL en producción para conservar solicitudes y productos.");
}

origenesConfigurados.forEach((origen) => {
  let url;
  try {
    url = new URL(origen);
  } catch {
    throw new Error(`CORS_ORIGINS contiene un origen inválido: ${origen}`);
  }

  if (
    origen === "*" ||
    url.origin !== origen ||
    !["http:", "https:"].includes(url.protocol)
  ) {
    throw new Error(`CORS_ORIGINS debe contener solo orígenes exactos HTTP(S), sin rutas ni comodines: ${origen}`);
  }

  origenesPermitidos.add(origen);
});

// Si hay un proxy HTTPS al desplegar, Express podrá reconocer la conexión segura.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const PgSessionStore = connectPgSimple(session);
const sessionOptions = {
  name: "michemango.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 1000,
  },
};

if (pool) {
  sessionOptions.store = new PgSessionStore({
    pool,
    tableName: "michemango_sessions",
    createTableIfMissing: true,
  });
}

// Creamos sesiones antes de las rutas que comprueban si el usuario inició sesión.
app.use(
  session(sessionOptions)
);

// Solo permitimos solicitudes desde el sitio configurado y orígenes locales de desarrollo.
app.use((req, res, next) => {
  const origen = req.get("Origin");

  if (!origen) {
    return next();
  }

  if (!origenesPermitidos.has(origen)) {
    return res.status(403).json({ error: "Este origen no tiene permiso para usar la API." });
  }

  res.setHeader("Access-Control-Allow-Origin", origen);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
app.use("/admin", adminRouter);
app.use("/api/admin", adminApiRouter);

app.get("/api/health", async (req, res) => {
  try {
    if (pool) {
      await pool.query("SELECT 1");
    }

    return res.json({ status: "ok", storage: modoAlmacenamiento() });
  } catch (error) {
    console.error("La comprobación de salud no pudo acceder al almacenamiento:", error.message);
    return res.status(503).json({ status: "unavailable", storage: modoAlmacenamiento() });
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

// Informamos claramente si el cuerpo JSON enviado por el navegador no se puede leer.
app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Los datos enviados no tienen formato JSON válido." });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "Los datos enviados superan el tamaño permitido." });
  }

  console.error("Error inesperado del servidor:", error);
  return res.status(500).json({ error: "Ocurrió un error inesperado en el servidor." });
});

// Al iniciar este archivo directamente, dejamos al servidor escuchando en el puerto.
if (require.main === module) {
  inicializarAlmacenamiento()
    .then(() => {
      app.listen(PUERTO, () => {
        console.log(`MicheMango está disponible en el puerto ${PUERTO} (almacenamiento: ${modoAlmacenamiento()})`);
      });
    })
    .catch((error) => {
      console.error("No se pudo iniciar MicheMango:", error.message);
      if (pool) {
        pool.end().catch((closeError) => {
          console.error("No se pudo cerrar el pool de base de datos:", closeError.message);
        });
      }
      process.exitCode = 1;
    });
}

// Exportamos la aplicación para poder probar sus rutas sin iniciar otro servidor.
module.exports = app;
