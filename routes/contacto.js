// Estas rutas reciben y validan las solicitudes enviadas desde el formulario.
const express = require("express");
const { randomUUID } = require("crypto");
const { guardarSolicitud } = require("../data/solicitudes");

const router = express.Router();
const TIPOS_PERMITIDOS = ["pedido", "cotizacion_evento", "duda"];
const MAXIMO_NOMBRE = 80;
const MAXIMO_TELEFONO = 25;
const MAXIMO_MENSAJE = 1000;

// Aceptamos teléfonos en formatos comunes y comprobamos su cantidad de dígitos.
function esTelefonoValido(telefono) {
  if (typeof telefono !== "string" || telefono.length > MAXIMO_TELEFONO) {
    return false;
  }

  const digitos = telefono.replace(/\D/g, "");
  return /^\+?[\d\s().-]+$/.test(telefono) && digitos.length >= 7 && digitos.length <= 15;
}

// Comprobamos la información en el servidor: las validaciones del navegador no bastan.
router.post("/contacto", (req, res) => {
  const cuerpo = req.body;

  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    return res.status(400).json({ error: "Envía los datos del formulario en formato válido." });
  }

  const nombre = typeof cuerpo.nombre === "string" ? cuerpo.nombre.trim() : "";
  const telefono = typeof cuerpo.telefono === "string" ? cuerpo.telefono.trim() : "";
  const mensaje = typeof cuerpo.mensaje === "string" ? cuerpo.mensaje.trim() : "";
  const tipo = typeof cuerpo.tipo === "string" ? cuerpo.tipo : "";

  if (!nombre || nombre.length > MAXIMO_NOMBRE) {
    return res.status(400).json({
      error: `Escribe tu nombre (máximo ${MAXIMO_NOMBRE} caracteres).`,
    });
  }

  if (!esTelefonoValido(telefono)) {
    return res.status(400).json({
      error: "Escribe un teléfono válido con entre 7 y 15 dígitos.",
    });
  }

  if (!mensaje || mensaje.length > MAXIMO_MENSAJE) {
    return res.status(400).json({
      error: `Escribe un mensaje (máximo ${MAXIMO_MENSAJE} caracteres).`,
    });
  }

  if (!TIPOS_PERMITIDOS.includes(tipo)) {
    return res.status(400).json({ error: "Selecciona un tipo de solicitud válido." });
  }

  // Guardamos una copia limpia con identificador, fecha y estado inicial.
  const solicitud = {
    id: randomUUID(),
    fecha: new Date().toISOString(),
    nombre,
    telefono,
    tipo,
    mensaje,
    estado: "nueva",
  };

  try {
    guardarSolicitud(solicitud);
  } catch (error) {
    console.error("No se pudo guardar la solicitud de contacto:", error);
    return res.status(500).json({
      error: "No pudimos guardar tu mensaje en este momento. Inténtalo más tarde.",
    });
  }

  return res.status(201).json({
    mensaje: "¡Gracias por escribirnos! Recibimos tu solicitud y pronto nos comunicaremos contigo.",
    solicitud: {
      id: solicitud.id,
      fecha: solicitud.fecha,
      estado: solicitud.estado,
    },
  });
});

module.exports = router;
