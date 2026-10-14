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
const ESTADOS_PERMITIDOS = ["nueva", "atendida"];

// Bloqueamos todas las rutas de esta API si la sesión no está iniciada.
router.use(requiereAdminApi);
router.use(express.json({ limit: "10kb" }));

// Entregamos al panel la lista de solicitudes guardadas.
router.get("/solicitudes", (req, res) => {
  res.json(leerSolicitudes());
});

// Permitimos cambiar únicamente a los estados definidos para esta etapa.
router.patch("/solicitudes/:id/estado", (req, res) => {
  const estado = req.body && req.body.estado;

  if (!ESTADOS_PERMITIDOS.includes(estado)) {
    return res.status(400).json({ error: "El estado debe ser nueva o atendida." });
  }

  const solicitud = actualizarEstadoSolicitud(req.params.id, estado);

  if (!solicitud) {
    return res.status(404).json({ error: "No encontramos esa solicitud." });
  }

  return res.json({ mensaje: "Estado actualizado.", solicitud });
});

// Eliminamos una solicitud solo después de que el panel pida expresamente hacerlo.
router.delete("/solicitudes/:id", (req, res) => {
  const eliminada = eliminarSolicitud(req.params.id);

  if (!eliminada) {
    return res.status(404).json({ error: "No encontramos esa solicitud." });
  }

  return res.json({ mensaje: "Solicitud eliminada." });
});

router.get("/productos", (req, res) => {
  res.json(leerProductos());
});

router.post("/productos", (req, res) => {
  const cuerpo = req.body;

  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    return res.status(400).json({ error: "Envía un producto válido en formato JSON." });
  }

  try {
    const producto = crearProducto(cuerpo);
    return res.status(201).json({ mensaje: "Producto creado.", producto });
  } catch (error) {
    if (error.code !== "INVALID_PRODUCT") {
      console.error("No se pudo guardar el producto:", error);
      return res.status(500).json({ error: "No se pudo guardar el producto en el servidor." });
    }
    return res.status(400).json({ error: error.message });
  }
});

router.patch("/productos/:id", (req, res) => {
  const cuerpo = req.body;

  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    return res.status(400).json({ error: "Envía los datos del producto en formato JSON." });
  }

  try {
    const producto = actualizarProducto(req.params.id, cuerpo);

    if (!producto) {
      return res.status(404).json({ error: "No encontramos ese producto." });
    }

    return res.json({ mensaje: "Producto actualizado.", producto });
  } catch (error) {
    if (error.code !== "INVALID_PRODUCT") {
      console.error("No se pudo actualizar el producto:", error);
      return res.status(500).json({ error: "No se pudo actualizar el producto en el servidor." });
    }
    return res.status(400).json({ error: error.message });
  }
});

router.delete("/productos/:id", (req, res) => {
  const eliminado = eliminarProducto(req.params.id);

  if (!eliminado) {
    return res.status(404).json({ error: "No encontramos ese producto." });
  }

  return res.json({ mensaje: "Producto eliminado." });
});

module.exports = router;
