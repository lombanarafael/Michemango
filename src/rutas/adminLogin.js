// Inicio de sesión del administrador.
// La contraseña nunca se guarda en texto: en el entorno solo está su hash bcrypt (ADMIN_PASSWORD_HASH).
const express = require("express");
const bcrypt = require("bcryptjs");
const { crearTokenAdmin, requiereAdminApi } = require("../middleware/requiereAdmin");
const { limitarLogin } = require("../middleware/limitadores");

const router = express.Router();
router.use(express.json({ limit: "2kb" }));

router.post("/login", limitarLogin, async (req, res, next) => {
  const usuario = typeof req.body?.usuario === "string" ? req.body.usuario.trim() : "";
  const contrasena = typeof req.body?.contrasena === "string" ? req.body.contrasena : "";

  if (!usuario || !contrasena || usuario.length > 120 || contrasena.length > 200) {
    return res.status(400).json({ error: "Escribe un usuario y una contraseña válidos." });
  }

  try {
    // bcrypt.compare calcula el hash de lo que escribió la persona y lo compara con el guardado.
    const contrasenaCorrecta = await bcrypt.compare(contrasena, process.env.ADMIN_PASSWORD_HASH);
    const usuarioCorrecto = usuario === (process.env.ADMIN_USERNAME || process.env.ADMIN_USER);

    if (!usuarioCorrecto || !contrasenaCorrecta) {
      return res.status(401).json({ error: "El usuario o la contraseña no son correctos." });
    }
  } catch (error) {
    console.error("No se pudo comprobar la contraseña administrativa.", error.code || error.name);
    return next(error);
  }

  return res.json({
    mensaje: "Sesión iniciada.",
    token: crearTokenAdmin(usuario),
  });
});

// Permite al panel comprobar si el token sigue siendo válido.
router.get("/session", requiereAdminApi, (req, res) => {
  res.json({ autenticado: true });
});

module.exports = router;
