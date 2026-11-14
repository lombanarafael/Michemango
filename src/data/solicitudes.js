// Operaciones de la tabla de solicitudes (mensajes del formulario de contacto).
const { consulta } = require("./baseDatos");

const COLUMNAS = `id, fecha, nombre, correo, telefono, tipo, mensaje, estado,
  producto_interes AS "productoInteres"`;

// Lista las solicitudes, de la más nueva a la más antigua. Si llega un estado, filtra por él.
async function leerSolicitudes(estado = "") {
  const { rows } = estado
    ? await consulta(`SELECT ${COLUMNAS} FROM michemango_requests WHERE estado = $1 ORDER BY fecha DESC`, [estado])
    : await consulta(`SELECT ${COLUMNAS} FROM michemango_requests ORDER BY fecha DESC`);
  return rows;
}

// Guarda una solicitud nueva. "ON CONFLICT DO NOTHING": si llega dos veces el mismo id
// (por ejemplo, un reintento con la misma Idempotency-Key), no se duplica.
async function guardarSolicitud(solicitud) {
  await consulta(
    `INSERT INTO michemango_requests
      (id, fecha, nombre, correo, telefono, tipo, producto_interes, mensaje, estado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO NOTHING`,
    [
      solicitud.id,
      solicitud.fecha,
      solicitud.nombre,
      solicitud.correo,
      solicitud.telefono,
      solicitud.tipo,
      solicitud.productoInteres,
      solicitud.mensaje,
      solicitud.estado,
    ],
  );
  const { rows } = await consulta("SELECT id, fecha, estado FROM michemango_requests WHERE id = $1", [solicitud.id]);
  return rows[0];
}

// Cambia el estado (nueva, confirmada o atendida). Devuelve null si el id no existe.
async function actualizarEstadoSolicitud(id, estado) {
  const { rows } = await consulta(
    `UPDATE michemango_requests SET estado = $1 WHERE id = $2 RETURNING ${COLUMNAS}`,
    [estado, String(id)],
  );
  return rows[0] || null;
}

// Borra una solicitud. Devuelve true si existía.
async function eliminarSolicitud(id) {
  const { rowCount } = await consulta("DELETE FROM michemango_requests WHERE id = $1", [String(id)]);
  return rowCount > 0;
}

module.exports = {
  leerSolicitudes,
  guardarSolicitud,
  actualizarEstadoSolicitud,
  eliminarSolicitud,
};
