// Estas rutas muestran el acceso y las páginas privadas del panel de administración.
const express = require("express");
const path = require("path");
const { requiereAdmin } = require("../middleware/requiereAdmin");

const router = express.Router();
const ARCHIVO_LOGIN = path.join(__dirname, "..", "..", "public", "admin", "login.html");
const ARCHIVO_PANEL = path.join(__dirname, "..", "..", "public", "admin", "panel.html");

// La sesión validada por Express decide qué página local devolver.
router.get("/login", (req, res) => {
  if (req.session && req.session.admin === true) {
    return res.sendFile(ARCHIVO_PANEL);
  }

  return res.sendFile(ARCHIVO_LOGIN);
});

// Protegemos la página principal del panel; sin sesión se redirige a la pantalla de acceso.
router.get("/", requiereAdmin, (req, res) => {
  res.sendFile(ARCHIVO_PANEL);
});

module.exports = router;
