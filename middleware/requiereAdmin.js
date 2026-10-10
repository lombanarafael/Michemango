// Estas comprobaciones separan el acceso a las páginas privadas del acceso a la API.
function requiereAdmin(req, res, next) {
  if (req.session && req.session.admin === true) {
    return next();
  }

  return res.redirect("/admin/login");
}

function requiereAdminApi(req, res, next) {
  if (req.session && req.session.admin === true) {
    return next();
  }

  return res.status(401).json({ error: "Debes iniciar sesión para realizar esta acción." });
}

module.exports = { requiereAdmin, requiereAdminApi };
