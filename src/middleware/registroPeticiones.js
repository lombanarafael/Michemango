// Registra cada petición en la consola (método, ruta, código de respuesta y duración).
// En Render se ve en la pestaña "Logs". Cada petición recibe un id para poder rastrearla.
const { randomUUID } = require("crypto");

function registroPeticiones(req, res, next) {
  const id = randomUUID();
  const startedAt = Date.now();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);

  res.on("finish", () => {
    console.info(JSON.stringify({
      requestId: id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    }));
  });

  next();
}

module.exports = registroPeticiones;
