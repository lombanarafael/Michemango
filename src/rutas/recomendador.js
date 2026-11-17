

const express = require("express");
const { leerProductos } = require("../data/productos");
const { limitarRecomendaciones } = require("../middleware/limitadores");
const { recomendarProducto, explicarRazones } = require("../../frontend/src/recomendador.js");

const router = express.Router();
const SABORES = ["dulce", "picante", "acido", "refrescante", "cualquiera"];
const TAMANOS = ["pequeno", "mediano", "grande", "cualquiera"];
const OCASIONES = ["antojo", "celebracion", "compartir", "regalo", "cualquiera"];

router.post("/recomendaciones", limitarRecomendaciones, async (req, res) => {
  const { sabor, tamano, ocasion } = req.body || {};
  if (!SABORES.includes(sabor) || !TAMANOS.includes(tamano) || !OCASIONES.includes(ocasion)) {
    return res.status(400).json({ error: "Elige una opción válida de sabor, tamaño y ocasión." });
  }

  try {
    const productos = await leerProductos();
    const resultado = recomendarProducto(productos, { sabor, tamano, ocasion });
    if (!resultado) {
      return res.status(503).json({ error: "El catálogo está vacío; no hay productos para recomendar." });
    }
    return res.json({
      producto: resultado.producto,
      motivo: explicarRazones(resultado.razones),
      modo: "reglas",
    });
  } catch (error) {
    console.error("No se pudo generar la recomendación.", error.code || error.name);
    return res.status(500).json({ error: "No se pudo generar una recomendación en este momento." });
  }
});

module.exports = router;
