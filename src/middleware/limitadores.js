const { rateLimit } = require("express-rate-limit");

function crearLimitador(ventanaMs, maximo, mensaje) {
  return rateLimit({
    windowMs: ventanaMs,
    limit: maximo,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: mensaje },
  });
}

module.exports = {
  limitarLogin: crearLimitador(15 * 60 * 1000, 5, "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo."),
  limitarSolicitudes: crearLimitador(15 * 60 * 1000, 5, "Se alcanzó el límite de solicitudes. Inténtalo más tarde."),
  limitarRecomendaciones: crearLimitador(15 * 60 * 1000, 20, "Se alcanzó el límite de recomendaciones. Inténtalo más tarde."),
};
