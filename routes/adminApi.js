// Estas rutas permiten consultar y gestionar solicitudes solo a administradores.
const express = require("express");
const { requiereAdminApi } = require("../middleware/requiereAdmin");
const {
  leerSolicitudes,
  actualizarEstadoSolicitud,
  eliminarSolicitud,
} = require("../data/solicitudes");

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

module.exports = router;
