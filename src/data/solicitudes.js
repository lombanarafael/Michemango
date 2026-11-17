
const { consulta } = require("./baseDatos");

const COLUMNAS = `id, fecha, nombre, correo, telefono, tipo, mensaje, estado,
  producto_interes AS "productoInteres"`;


async function leerSolicitudes(estado = "") {
  const { rows } = estado
    ? await consulta(`SELECT ${COLUMNAS} FROM michemango_requests WHERE estado = $1 ORDER BY fecha DESC`, [estado])
    : await consulta(`SELECT ${COLUMNAS} FROM michemango_requests ORDER BY fecha DESC`);
  return rows;
}


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


async function actualizarEstadoSolicitud(id, estado) {
  const { rows } = await consulta(
    `UPDATE michemango_requests SET estado = $1 WHERE id = $2 RETURNING ${COLUMNAS}`,
    [estado, String(id)],
  );
  return rows[0] || null;
}


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
