// Estas rutas cargan la SPA de React; los datos privados siguen protegidos por JWT.
const express = require("express");
const path = require("path");

const router = express.Router();
const ARCHIVO_APP = path.join(__dirname, "..", "..", "dist", "index.html");

router.get("/login", (req, res) => {
  return res.sendFile(ARCHIVO_APP);
});

router.get("/", (req, res) => {
  res.sendFile(ARCHIVO_APP);
});

module.exports = router;
