// Estas rutas muestran el acceso y las páginas privadas del panel de administración.
const express = require("express");
const path = require("path");

const router = express.Router();
const ARCHIVO_LOGIN = path.join(__dirname, "..", "..", "public", "admin", "login.html");
const ARCHIVO_PANEL = path.join(__dirname, "..", "..", "public", "admin", "panel.html");

// Las páginas son públicas; sus datos siguen protegidos por el token JWT de la API.
router.get("/login", (req, res) => {
  return res.sendFile(ARCHIVO_LOGIN);
});

router.get("/", (req, res) => {
  res.sendFile(ARCHIVO_PANEL);
});

module.exports = router;
