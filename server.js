// Cargamos la configuración privada del archivo .env antes de iniciar Express.
require("dotenv").config();

// Importamos Express, las rutas y el catálogo del emprendimiento.
const express = require("express");
const productos = require("./productos");
const contactoRouter = require("./routes/contacto");
const chatRouter = require("./routes/chat");
const adminRouter = require("./routes/admin");
const adminApiRouter = require("./routes/adminApi");
const path = require("path");
const session = require("express-session");

// Creamos la aplicación y ubicamos la carpeta pública del sitio.
const app = express();
const PUERTO = process.env.PORT || 3000;
const CARPETA_PUBLICA = path.join(__dirname, "public");

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

if (!process.env.ANTHROPIC_MODEL) {
  throw new Error("Configura ANTHROPIC_MODEL en el archivo .env.");
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
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 1000,
    },
  })
);

// Servimos los archivos públicos y protegemos la API de administración antes de leer su cuerpo.
app.use(express.static(CARPETA_PUBLICA));
app.use("/api/admin", adminApiRouter);

// Permitimos recibir datos JSON para el formulario y el inicio de sesión.
app.use(express.json({ limit: "10kb" }));

// Conectamos las rutas relacionadas con las solicitudes de contacto.
app.use("/api", contactoRouter);
app.use("/api", chatRouter);
app.use("/admin", adminRouter);

// Conservamos la ruta del catálogo disponible desde el primer servidor.
app.get("/api/productos", (req, res) => {
  res.json(productos);
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
