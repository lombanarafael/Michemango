// Estas rutas permiten consultar y gestionar solicitudes y productos solo a administradores.
const express = require("express");
const { requiereAdminApi } = require("../middleware/requiereAdmin");
const {
  leerSolicitudes,
  actualizarEstadoSolicitud,
  eliminarSolicitud,
} = require("../data/solicitudes");
const {
  leerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} = require("../productos");

const router = express.Router();
const ESTADOS_PERMITIDOS = ["nueva", "confirmada", "atendida"];

// Bloqueamos todas las rutas de esta API si la sesión no está iniciada.
router.use(requiereAdminApi);
router.use(express.json({ limit: "10kb" }));

// Entregamos al panel la lista de solicitudes guardadas.
router.get("/solicitudes", async (req, res) => {
  const estado = typeof req.query.estado === "string" ? req.query.estado : "";
  if (estado && !ESTADOS_PERMITIDOS.includes(estado)) {
    return res.status(400).json({ error: "El filtro debe ser nueva, confirmada o atendida." });
  }
  res.json(await leerSolicitudes(estado));
});

// Permitimos cambiar únicamente a los estados definidos para esta etapa.
router.patch("/solicitudes/:id/estado", async (req, res) => {
  const estado = req.body && req.body.estado;

  if (!ESTADOS_PERMITIDOS.includes(estado)) {
    return res.status(400).json({ error: "El estado debe ser nueva, confirmada o atendida." });
  }

  const solicitud = await actualizarEstadoSolicitud(req.params.id, estado);

  if (!solicitud) {
    return res.status(404).json({ error: "No encontramos esa solicitud." });
  }

  return res.json({ mensaje: "Estado actualizado.", solicitud });
});

// Eliminamos una solicitud solo después de que el panel pida expresamente hacerlo.
router.delete("/solicitudes/:id", async (req, res) => {
  const eliminada = await eliminarSolicitud(req.params.id);

  if (!eliminada) {
    return res.status(404).json({ error: "No encontramos esa solicitud." });
  }

  return res.json({ mensaje: "Solicitud eliminada." });
});

router.get("/productos", async (req, res) => {
  res.json(await leerProductos());
});

router.post("/productos", async (req, res) => {
  const cuerpo = req.body;

  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    return res.status(400).json({ error: "Envía un producto válido en formato JSON." });
  }

  try {
    const producto = await crearProducto(cuerpo);
    return res.status(201).json({ mensaje: "Producto creado.", producto });
  } catch (error) {
    if (error.code !== "INVALID_PRODUCT") {
      console.error("No se pudo guardar el producto.", error.code || error.name);
      return res.status(500).json({ error: "No se pudo guardar el producto en el servidor." });
    }
    return res.status(400).json({ error: error.message });
  }
});

router.patch("/productos/:id", async (req, res) => {
  const cuerpo = req.body;

  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    return res.status(400).json({ error: "Envía los datos del producto en formato JSON." });
  }

  try {
    const producto = await actualizarProducto(req.params.id, cuerpo);

    if (!producto) {
      return res.status(404).json({ error: "No encontramos ese producto." });
    }

    return res.json({ mensaje: "Producto actualizado.", producto });
  } catch (error) {
    if (error.code !== "INVALID_PRODUCT") {
      console.error("No se pudo actualizar el producto.", error.code || error.name);
      return res.status(500).json({ error: "No se pudo actualizar el producto en el servidor." });
    }
    return res.status(400).json({ error: error.message });
  }
});

router.delete("/productos/:id", async (req, res) => {
  const eliminado = await eliminarProducto(req.params.id);

  if (!eliminado) {
    return res.status(404).json({ error: "No encontramos ese producto." });
  }

  return res.json({ mensaje: "Producto eliminado." });
});

module.exports = router;
