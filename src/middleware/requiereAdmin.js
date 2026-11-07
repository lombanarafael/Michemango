const jwt = require("jsonwebtoken");

// Firmamos el token del administrador y hacemos que venza después de ocho horas.
function crearTokenAdmin(usuario) {
  return jwt.sign(
    { rol: "admin" },
    process.env.JWT_SECRET,
    { subject: usuario, expiresIn: "8h", algorithm: "HS256" }
  );
}

function requiereAdminApi(req, res, next) {
  const autorizacion = req.get("Authorization") || "";
  const coincidencia = autorizacion.match(/^Bearer (.+)$/);
  if (!coincidencia) {
    return res.status(401).json({ error: "Debes iniciar sesión para realizar esta acción." });
  }

  try {
    const datos = jwt.verify(coincidencia[1], process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (
      typeof datos !== "object" ||
      datos === null ||
      datos.rol !== "admin" ||
      typeof datos.sub !== "string"
    ) {
      return res.status(401).json({ error: "Tu sesión venció. Inicia sesión de nuevo." });
    }

    req.admin = { usuario: datos.sub };
    return next();
  } catch {
    return res.status(401).json({ error: "Tu sesión venció. Inicia sesión de nuevo." });
  }
}

module.exports = { crearTokenAdmin, requiereAdminApi };
