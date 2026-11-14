// Límite de peticiones: cuántas veces puede llamar una misma IP en una ventana de tiempo.
// Protege el login de quien intenta adivinar contraseñas y el formulario del spam.
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

// Ventana de 15 minutos: 5 intentos de login, 5 mensajes de contacto y 20 recomendaciones.
module.exports = {
  limitarLogin: crearLimitador(15 * 60 * 1000, 5, "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo."),
  limitarSolicitudes: crearLimitador(15 * 60 * 1000, 5, "Se alcanzó el límite de solicitudes. Inténtalo más tarde."),
  limitarRecomendaciones: crearLimitador(15 * 60 * 1000, 20, "Se alcanzó el límite de recomendaciones. Inténtalo más tarde."),
};
