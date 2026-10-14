// Esta pequeña capa se encarga de guardar las solicitudes en un archivo JSON.
const fs = require("fs");
const path = require("path");
const { pool } = require("./storage");

const CARPETA_DATOS = __dirname;
const ARCHIVO_SOLICITUDES = path.join(CARPETA_DATOS, "solicitudes.json");

// Leemos las solicitudes guardadas; si es la primera, comenzamos con una lista vacía.
async function leerSolicitudes() {
  if (pool) {
    const resultado = await pool.query(
      `SELECT id, fecha, nombre, correo, telefono, tipo, mensaje, estado
       FROM michemango_requests
       ORDER BY fecha DESC`
    );
    return resultado.rows;
  }

  try {
    const contenido = fs.readFileSync(ARCHIVO_SOLICITUDES, "utf8");
    const solicitudes = JSON.parse(contenido);

    if (!Array.isArray(solicitudes)) {
      throw new Error("El archivo de solicitudes debe contener una lista JSON.");
    }

    return solicitudes;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

// Escribimos los cambios de forma temporal antes de reemplazar el JSON principal.
function escribirSolicitudes(solicitudes) {
  fs.mkdirSync(CARPETA_DATOS, { recursive: true });

  const archivoTemporal = `${ARCHIVO_SOLICITUDES}.${process.pid}.tmp`;
  fs.writeFileSync(archivoTemporal, JSON.stringify(solicitudes, null, 2), "utf8");
  fs.renameSync(archivoTemporal, ARCHIVO_SOLICITUDES);
}

// Agregamos una nueva solicitud sin perder las que ya estaban guardadas.
async function guardarSolicitud(solicitud) {
  if (pool) {
    await pool.query(
      `INSERT INTO michemango_requests
        (id, fecha, nombre, correo, telefono, tipo, mensaje, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        solicitud.id,
        solicitud.fecha,
        solicitud.nombre,
        solicitud.correo,
        solicitud.telefono,
        solicitud.tipo,
        solicitud.mensaje,
        solicitud.estado,
      ]
    );
    return;
  }

  const solicitudes = await leerSolicitudes();
  solicitudes.push(solicitud);
  escribirSolicitudes(solicitudes);
}

// Cambiamos el estado y devolvemos la solicitud, o null si no existe.
async function actualizarEstadoSolicitud(id, estado) {
  if (pool) {
    const resultado = await pool.query(
      `UPDATE michemango_requests SET estado = $2
       WHERE id = $1
       RETURNING id, fecha, nombre, correo, telefono, tipo, mensaje, estado`,
      [String(id), estado]
    );
    return resultado.rows[0] || null;
  }

  const solicitudes = await leerSolicitudes();
  const solicitud = solicitudes.find((elemento) => elemento.id === id);

  if (!solicitud) {
    return null;
  }

  solicitud.estado = estado;
  escribirSolicitudes(solicitudes);
  return solicitud;
}

// Eliminamos una solicitud por su identificador y avisamos si no se encontró.
async function eliminarSolicitud(id) {
  if (pool) {
    const resultado = await pool.query("DELETE FROM michemango_requests WHERE id = $1", [String(id)]);
    return resultado.rowCount > 0;
  }

  const solicitudes = await leerSolicitudes();
  const indice = solicitudes.findIndex((elemento) => elemento.id === id);

  if (indice === -1) {
    return false;
  }

  solicitudes.splice(indice, 1);
  escribirSolicitudes(solicitudes);
  return true;
}

module.exports = {
  leerSolicitudes,
  guardarSolicitud,
  actualizarEstadoSolicitud,
  eliminarSolicitud,
};
