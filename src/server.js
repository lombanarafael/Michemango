// Cargamos la configuración privada del archivo .env antes de iniciar Express.
require("dotenv").config();

// Importamos Express, las rutas y la fuente de datos del catálogo.
const express = require("express");
const { leerProductos } = require("./productos");
const contactoRouter = require("./routes/contacto");
const adminRouter = require("./routes/admin");
const adminApiRouter = require("./routes/adminApi");
const path = require("path");
const session = require("express-session");

// Creamos la aplicación y ubicamos la carpeta pública del sitio.
const app = express();
const PUERTO = process.env.PORT || 3000;
const CARPETA_PUBLICA = path.join(__dirname, "..", "public");
const origenesPermitidos = new Set(
  (process.env.CORS_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((origen) => origen.trim())
    .filter(Boolean)
);

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

// Si hay un proxy HTTPS al desplegar, Express podrá reconocer la conexión segura.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Creamos sesiones antes de las rutas que comprueban si el usuario inició sesión.
app.use(
  session({
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
  })
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

// Conservamos la ruta del catálogo disponible desde el primer servidor.
app.get("/api/productos", (req, res) => {
  res.json(leerProductos());
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
  app.listen(PUERTO, () => {
    console.log(`MicheMango está disponible en http://localhost:${PUERTO}`);
  });
}

// Exportamos la aplicación para poder probar sus rutas sin iniciar otro servidor.
module.exports = app;
