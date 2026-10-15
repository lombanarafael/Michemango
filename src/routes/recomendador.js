const express = require("express");
const { leerProductos } = require("../productos");
const { limitarRecomendaciones } = require("../middleware/rateLimiters");

const router = express.Router();
const SABORES = ["dulce", "picante", "acido", "refrescante", "cualquiera"];
const TAMANOS = ["pequeno", "mediano", "grande", "cualquiera"];
const OCASIONES = ["antojo", "celebracion", "compartir", "regalo", "cualquiera"];

function elegirPorReglas(productos, preferencias) {
  const puntuados = productos.map((producto) => {
    const texto = `${producto.nombre} ${producto.categoria} ${producto.descripcion}`.toLocaleLowerCase("es-CO");
    let puntos = 0;

    if (preferencias.sabor === "picante" && /picante|taj[ií]n|chamoy/.test(texto)) puntos += 4;
    if (preferencias.sabor === "picante" && String(producto.categoria || "").toLocaleLowerCase("es-CO") === "picante") puntos += 2;
    if (preferencias.sabor === "dulce" && /dulce|gomitas|fruta|premium/.test(texto)) puntos += 3;
    if (preferencias.sabor === "acido" && /lim[oó]n|maracuy[aá]|[aá]cid/.test(texto)) puntos += 3;
    if (preferencias.sabor === "refrescante" && /fresco|refrescante|lim[oó]n/.test(texto)) puntos += 3;
    const esPequeno = /mini|pequeñ/.test(texto);
    const esGrande = /premium|explosivo/.test(texto);
    if (preferencias.tamano === "pequeno") puntos += esPequeno ? 4 : -1;
    if (preferencias.tamano === "mediano") puntos += esPequeno ? -2 : esGrande ? 1 : 3;
    if (preferencias.tamano === "grande") puntos += esGrande ? 4 : -1;
    if (preferencias.ocasión === "celebracion") puntos += esGrande ? 3 : 0;
    if (preferencias.ocasión === "compartir") puntos += esGrande ? 2 : 0;
    if (preferencias.ocasión === "regalo") puntos += esGrande ? 3 : 0;
    if (preferencias.ocasión === "antojo") puntos += esPequeno || /cl[aá]sico/.test(texto) ? 2 : 0;

    return { producto, puntos };
  });

  return puntuados.sort((a, b) => b.puntos - a.puntos || a.producto.precio - b.producto.precio)[0];
}

router.post("/recomendaciones", limitarRecomendaciones, async (req, res) => {
  const preferencias = req.body;
  if (!preferencias || typeof preferencias !== "object" || Array.isArray(preferencias)) {
    return res.status(400).json({ error: "Envía tus preferencias en formato válido." });
  }

  const sabor = typeof preferencias.sabor === "string" ? preferencias.sabor : "";
  const tamano = typeof preferencias.tamano === "string" ? preferencias.tamano : "";
  const ocasion = typeof preferencias.ocasion === "string" ? preferencias.ocasion : "";
  if (!SABORES.includes(sabor) || !TAMANOS.includes(tamano) || !OCASIONES.includes(ocasion)) {
    return res.status(400).json({ error: "Elige una opción válida de sabor, tamaño y ocasión." });
  }

  try {
    const productos = await leerProductos();
    if (productos.length === 0) {
      return res.status(503).json({ error: "El catálogo está vacío; no hay productos para recomendar." });
    }

    const sugerencia = elegirPorReglas(productos, { sabor, tamano, ocasión: ocasion });
    const seleccion = {
      producto: sugerencia.producto,
      motivo: "Elegido según tus preferencias y los datos disponibles del catálogo.",
    };

    return res.json({
      ...seleccion,
      modo: "reglas",
      aviso: "Sugerencia basada en tus preferencias y en el catálogo MicheMango.",
    });
  } catch (error) {
    console.error("No se pudo generar la recomendación.", error.code || error.name);
    return res.status(500).json({ error: "No se pudo generar una recomendación en este momento." });
  }
});

module.exports = router;
