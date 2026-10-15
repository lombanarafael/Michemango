// Estas rutas reciben y validan las solicitudes enviadas desde el formulario.
const express = require("express");
const { randomUUID } = require("crypto");
const { guardarSolicitud } = require("../data/solicitudes");
const { leerProductos } = require("../productos");
const { limitarSolicitudes } = require("../middleware/rateLimiters");

const router = express.Router();
const TIPOS_PERMITIDOS = ["pedido", "cotizacion_evento", "duda"];
const MAXIMO_NOMBRE = 80;
const MAXIMO_CORREO = 120;
const MAXIMO_TELEFONO = 25;
const MAXIMO_MENSAJE = 1000;

function limpiarTexto(valor) {
  return typeof valor === "string"
    ? valor.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

// Aceptamos teléfonos en formatos comunes y comprobamos su cantidad de dígitos.
function esTelefonoValido(telefono) {
  if (telefono === "") {
    return true;
  }

  if (typeof telefono !== "string" || telefono.length > MAXIMO_TELEFONO) {
    return false;
  }

  const digitos = telefono.replace(/\D/g, "");
  return /^\+?[\d\s().-]+$/.test(telefono) && digitos.length >= 7 && digitos.length <= 15;
}

// Comprobamos la información en el servidor: las validaciones del navegador no bastan.
router.post(["/contacto", "/solicitudes"], limitarSolicitudes, async (req, res) => {
  const cuerpo = req.body;

  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    return res.status(400).json({ error: "Envía los datos del formulario en formato válido." });
  }

  const nombre = limpiarTexto(cuerpo.nombre);
  const correo = limpiarTexto(cuerpo.correo).toLowerCase();
  const telefono = limpiarTexto(cuerpo.telefono);
  const mensaje = limpiarTexto(cuerpo.mensaje);
  const tipo = typeof cuerpo.tipo === "string" ? cuerpo.tipo : "";
  const productoInteres = limpiarTexto(cuerpo.productoInteres);

  if (
    cuerpo.telefono !== undefined &&
    cuerpo.telefono !== null &&
    typeof cuerpo.telefono !== "string"
  ) {
    return res.status(400).json({ error: "El teléfono debe ser texto o quedar vacío." });
  }

  if (
    cuerpo.correo !== undefined &&
    cuerpo.correo !== null &&
    typeof cuerpo.correo !== "string"
  ) {
    return res.status(400).json({ error: "El correo debe ser texto o quedar vacío." });
  }

  if (!nombre || nombre.length > MAXIMO_NOMBRE) {
    return res.status(400).json({
      error: `Escribe tu nombre (máximo ${MAXIMO_NOMBRE} caracteres).`,
    });
  }

  if (!correo && !telefono) {
    return res.status(400).json({ error: "Escribe un teléfono o correo para poder contactarte." });
  }

  if (correo && (
    correo.length > MAXIMO_CORREO ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
  )) {
    return res.status(400).json({ error: "Escribe un correo electrónico válido." });
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

  try {
    if (!productoInteres || productoInteres.length > 80) {
      return res.status(400).json({ error: "Selecciona el producto que te interesa." });
    }

    const productos = await leerProductos();
    const productoCoincidente = productos.find(
      (producto) => producto.nombre.toLocaleLowerCase("es-CO") === productoInteres.toLocaleLowerCase("es-CO")
    );
    if (!productoCoincidente) {
      return res.status(400).json({ error: "Selecciona un producto disponible del catálogo." });
    }

    const claveIdempotencia = req.get("Idempotency-Key");
    if (claveIdempotencia && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claveIdempotencia)) {
      return res.status(400).json({ error: "La solicitud no tiene un identificador válido." });
    }

    const solicitud = {
      id: claveIdempotencia || randomUUID(),
      fecha: new Date().toISOString(),
      nombre,
      correo: correo || null,
      telefono: telefono || null,
      tipo,
      productoInteres: productoCoincidente.nombre,
      mensaje,
      estado: "nueva",
    };

    const solicitudGuardada = await guardarSolicitud(solicitud);
    return res.status(201).json({
      mensaje: "¡Gracias! Registramos tu solicitud y nos pondremos en contacto contigo.",
      solicitud: {
        id: solicitudGuardada.id,
        fecha: solicitudGuardada.fecha,
        estado: solicitudGuardada.estado,
      },
    });
  } catch (error) {
    console.error("No se pudo registrar la solicitud.", error.code || error.name);
    return res.status(500).json({
      error: "No pudimos guardar tu mensaje en este momento. Inténtalo más tarde.",
    });
  }
});

module.exports = router;
