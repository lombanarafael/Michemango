// Esta ruta recibe mensajes del navegador y consulta a Claude solo desde el servidor.
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const instrucciones = require("../prompts/chatbotSistema");

const router = express.Router();
const MAXIMO_MENSAJE = 500;
const MAXIMO_TURNOS = 9;
const MODELO_POR_DEFECTO = "claude-haiku-5-5";

// Comprobamos que el historial solo contenga turnos alternados y texto breve.
function validarMensajes(mensajes) {
  if (
    !Array.isArray(mensajes) ||
    mensajes.length === 0 ||
    mensajes.length > MAXIMO_TURNOS ||
    !mensajes[0] ||
    mensajes[0].role !== "user" ||
    !mensajes[mensajes.length - 1] ||
    mensajes[mensajes.length - 1].role !== "user"
  ) {
    return false;
  }

  return mensajes.every((mensaje, indice) => {
    const rolEsperado = indice % 2 === 0 ? "user" : "assistant";
    return (
      mensaje &&
      mensaje.role === rolEsperado &&
      typeof mensaje.content === "string" &&
      mensaje.content.trim().length > 0 &&
      mensaje.content.length <= MAXIMO_MENSAJE
    );
  });
}

// El navegador envía los mensajes, pero nunca recibe ni conoce la API key de Anthropic.
router.post("/chat", async (req, res) => {
  const mensajes = req.body && req.body.mensajes;

  if (!validarMensajes(mensajes)) {
    return res.status(400).json({
      error: `Envía hasta ${MAXIMO_TURNOS} mensajes alternados y no superes ${MAXIMO_MENSAJE} caracteres por mensaje.`,
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "El recomendador aún no está configurado. Prueba de nuevo más tarde.",
    });
  }

  try {
    const clienteAnthropic = new Anthropic({ apiKey });
    const respuesta = await clienteAnthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || MODELO_POR_DEFECTO,
      max_tokens: 220,
      system: instrucciones,
      messages: mensajes.map(({ role, content }) => ({
        role,
        content: content.trim(),
      })),
    });

    const texto = respuesta.content
      .filter((bloque) => bloque.type === "text")
      .map((bloque) => bloque.text)
      .join("\n")
      .trim();

    if (!texto) {
      throw new Error("Anthropic no devolvió una respuesta de texto.");
    }

    return res.json({ respuesta: texto });
  } catch (error) {
    const estadoApi = error && Number.isInteger(error.status) ? error.status : "desconocido";
    const detalle = error instanceof Error ? error.message : "Error desconocido.";
    console.error(`Falló la llamada al servicio de recomendación (${estadoApi}): ${detalle}`);
    return res.status(502).json({
      error: "El recomendador tuvo un problema. Inténtalo de nuevo en un momento o escríbenos por WhatsApp.",
    });
  }
});

module.exports = router;
