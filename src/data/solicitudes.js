const { pool, sqlite } = require("./storage");

async function leerSolicitudes(estado = "") {
  if (pool) {
    const parametros = estado ? [estado] : [];
    const resultado = await pool.query(
      `SELECT id, fecha, nombre, correo, telefono, tipo, mensaje, estado,
       producto_interes AS "productoInteres"
       FROM michemango_requests
       ${estado ? "WHERE estado = $1" : ""}
       ORDER BY fecha DESC`,
      parametros
    );
    return resultado.rows;
  }

  const filtro = estado ? "WHERE estado = ?" : "";
  const parametros = estado ? [estado] : [];
  return sqlite.prepare(
    `SELECT id, fecha, nombre, correo, telefono, tipo, mensaje, estado,
      producto_interes AS productoInteres
     FROM michemango_requests
     ${filtro}
     ORDER BY fecha DESC`
  ).all(...parametros);
}

async function guardarSolicitud(solicitud) {
  if (pool) {
    await pool.query(
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
      ]
    );
    const guardada = await pool.query(
      "SELECT id, fecha, estado FROM michemango_requests WHERE id = $1",
      [solicitud.id]
    );
    return guardada.rows[0];
  }

  sqlite.prepare(
    `INSERT INTO michemango_requests
      (id, fecha, nombre, correo, telefono, tipo, producto_interes, mensaje, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO NOTHING`
  ).run(
    solicitud.id,
    solicitud.fecha,
    solicitud.nombre,
    solicitud.correo,
    solicitud.telefono,
    solicitud.tipo,
    solicitud.productoInteres,
    solicitud.mensaje,
    solicitud.estado
  );
  return sqlite.prepare(
    "SELECT id, fecha, estado FROM michemango_requests WHERE id = ?"
  ).get(solicitud.id);
}

async function actualizarEstadoSolicitud(id, estado) {
  if (pool) {
    const resultado = await pool.query(
      `UPDATE michemango_requests SET estado = $2
       WHERE id = $1
       RETURNING id, fecha, nombre, correo, telefono, tipo, mensaje, estado,
         producto_interes AS "productoInteres"`,
      [String(id), estado]
    );
    return resultado.rows[0] || null;
  }

  const actualizada = sqlite.prepare(
    `UPDATE michemango_requests
     SET estado = ?
     WHERE id = ?
     RETURNING id, fecha, nombre, correo, telefono, tipo, mensaje, estado,
       producto_interes AS productoInteres`
  ).get(estado, String(id));
  return actualizada || null;
}

async function eliminarSolicitud(id) {
  if (pool) {
    const resultado = await pool.query("DELETE FROM michemango_requests WHERE id = $1", [String(id)]);
    return resultado.rowCount > 0;
  }

  const resultado = sqlite.prepare("DELETE FROM michemango_requests WHERE id = ?").run(String(id));
  return resultado.changes > 0;
}

module.exports = {
  leerSolicitudes,
  guardarSolicitud,
  actualizarEstadoSolicitud,
  eliminarSolicitud,
};
