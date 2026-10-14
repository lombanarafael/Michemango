const express = require("express");
const { leerProductos } = require("../productos");
const { limitarRecomendaciones } = require("../middleware/rateLimiters");

const router = express.Router();
const SABORES = ["dulce", "picante", "acido", "refrescante", "cualquiera"];
const TAMANOS = ["pequeno", "mediano", "grande", "cualquiera"];
const OCASIONES = ["antojo", "celebracion", "compartir", "regalo", "cualquiera"];
const MODELO_IA = process.env.OPENAI_MODEL || "gpt-4o-mini";

function elegirPorReglas(productos, preferencias) {
  const puntuados = productos.map((producto) => {
    const texto = `${producto.nombre} ${producto.categoria} ${producto.descripcion}`.toLocaleLowerCase("es-CO");
    let puntos = 0;

    if (preferencias.sabor === "picante" && /picante|taj[ií]n|chamoy/.test(texto)) puntos += 4;
    if (preferencias.sabor === "dulce" && /dulce|gomitas|fruta|premium/.test(texto)) puntos += 3;
    if (preferencias.sabor === "acido" && /lim[oó]n|maracuy[aá]|[aá]cid/.test(texto)) puntos += 3;
    if (preferencias.sabor === "refrescante" && /fresco|refrescante|lim[oó]n/.test(texto)) puntos += 3;
    if (preferencias.tamano === "pequeno" && /mini|pequeñ/.test(texto)) puntos += 4;
    if (preferencias.tamano === "grande" && /premium|explosivo/.test(texto)) puntos += 2;
    if (preferencias.ocasión === "celebracion" && /premium|explosivo/.test(texto)) puntos += 3;
    if (preferencias.ocasión === "compartir" && /premium|explosivo/.test(texto)) puntos += 2;
    if (preferencias.ocasión === "antojo" && /mini|cl[aá]sico/.test(texto)) puntos += 2;

    return { producto, puntos };
  });

  return puntuados.sort((a, b) => b.puntos - a.puntos || a.producto.precio - b.producto.precio)[0];
}

async function recomendarConOpenAI(productos, preferencias) {
  const respuesta = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(12000),
    body: JSON.stringify({
      model: MODELO_IA,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Eres el asesor de MicheMango en Barranquilla. Recomienda un solo producto del catálogo. No inventes productos, ingredientes, tamaños ni precios. Devuelve JSON con las claves producto (nombre exacto) y motivo (una frase breve en español).",
        },
        {
          role: "user",
          content: JSON.stringify({ preferencias, catalogo: productos.map(({ nombre, categoria, descripcion }) => ({ nombre, categoria, descripcion })) }),
        },
      ],
    }),
  });

  if (!respuesta.ok) {
    const error = new Error(`Proveedor de recomendaciones respondió HTTP ${respuesta.status}.`);
    error.code = "AI_PROVIDER_ERROR";
    throw error;
  }

  const resultado = await respuesta.json();
  const contenido = resultado.choices?.[0]?.message?.content;
  if (typeof contenido !== "string") {
    throw new Error("El proveedor no devolvió una recomendación legible.");
  }

  const recomendacion = JSON.parse(contenido);
  const producto = productos.find((item) => item.nombre === recomendacion.producto);
  if (!producto || typeof recomendacion.motivo !== "string" || !recomendacion.motivo.trim()) {
    throw new Error("El proveedor devolvió una recomendación fuera del catálogo.");
  }

  return { producto, motivo: recomendacion.motivo.trim().slice(0, 300) };
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

    let seleccion;
    let modo = "reglas";
    let aviso = "Sugerencia basada en reglas de preferencias. No es inteligencia artificial.";

    if (process.env.OPENAI_API_KEY) {
      try {
        seleccion = await recomendarConOpenAI(productos, { sabor, tamano, ocasion });
        modo = "ia";
        aviso = "Sugerencia generada por el proveedor de IA y verificada contra el catálogo.";
      } catch (error) {
        console.error("Falló la recomendación externa; se usará el modo por reglas.", error.code || error.name);
        aviso = "La IA no está disponible ahora; esta sugerencia se calculó con reglas programadas.";
      }
    }

    if (!seleccion) {
      const sugerencia = elegirPorReglas(productos, { sabor, tamano, ocasión: ocasion });
      seleccion = {
        producto: sugerencia.producto,
        motivo: "Elegido según tus preferencias y los datos disponibles del catálogo.",
      };
    }

    return res.json({ ...seleccion, modo, aviso });
  } catch (error) {
    console.error("No se pudo generar la recomendación.", error.code || error.name);
    return res.status(500).json({ error: "No se pudo generar una recomendación en este momento." });
  }
});

module.exports = router;
