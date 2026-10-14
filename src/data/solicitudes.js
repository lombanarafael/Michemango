// Esta pequeña capa se encarga de guardar las solicitudes en un archivo JSON.
const fs = require("fs");
const path = require("path");

const CARPETA_DATOS = __dirname;
const ARCHIVO_SOLICITUDES = path.join(CARPETA_DATOS, "solicitudes.json");

// Leemos las solicitudes guardadas; si es la primera, comenzamos con una lista vacía.
function leerSolicitudes() {
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
function guardarSolicitud(solicitud) {
  const solicitudes = leerSolicitudes();
  solicitudes.push(solicitud);
  escribirSolicitudes(solicitudes);
}

// Cambiamos el estado y devolvemos la solicitud, o null si no existe.
function actualizarEstadoSolicitud(id, estado) {
  const solicitudes = leerSolicitudes();
  const solicitud = solicitudes.find((elemento) => elemento.id === id);

  if (!solicitud) {
    return null;
  }

  solicitud.estado = estado;
  escribirSolicitudes(solicitudes);
  return solicitud;
}

// Eliminamos una solicitud por su identificador y avisamos si no se encontró.
function eliminarSolicitud(id) {
  const solicitudes = leerSolicitudes();
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
