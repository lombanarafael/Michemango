const express = require("express");
const bcrypt = require("bcryptjs");
const { requiereAdminApi } = require("../middleware/requiereAdmin");
const { limitarLogin } = require("../middleware/rateLimiters");

const router = express.Router();
router.use(express.json({ limit: "2kb" }));

router.post("/login", limitarLogin, async (req, res, next) => {
  const usuario = typeof req.body?.usuario === "string" ? req.body.usuario.trim() : "";
  const contrasena = typeof req.body?.contrasena === "string" ? req.body.contrasena : "";

  if (!usuario || !contrasena || usuario.length > 120 || contrasena.length > 200) {
    return res.status(400).json({ error: "Escribe un usuario y una contraseña válidos." });
  }

  try {
    const contrasenaCorrecta = await bcrypt.compare(contrasena, process.env.ADMIN_PASSWORD_HASH);
    const usuarioCorrecto = usuario === (process.env.ADMIN_USERNAME || process.env.ADMIN_USER);

    if (!usuarioCorrecto || !contrasenaCorrecta) {
      return res.status(401).json({ error: "El usuario o la contraseña no son correctos." });
    }
  } catch (error) {
    console.error("No se pudo comprobar la contraseña administrativa.", error.code || error.name);
    return next(error);
  }

  return req.session.regenerate((error) => {
    if (error) {
      console.error("No se pudo renovar la sesión administrativa.", error.code || error.name);
      return next(error);
    }

    req.session.admin = true;
    return req.session.save((errorAlGuardar) => {
      if (errorAlGuardar) {
        console.error("No se pudo guardar la sesión administrativa.", errorAlGuardar.code || errorAlGuardar.name);
        return next(errorAlGuardar);
      }
      return res.json({ mensaje: "Sesión iniciada." });
    });
  });
});

router.get("/session", requiereAdminApi, (req, res) => {
  res.json({ autenticado: true });
});

router.post("/logout", requiereAdminApi, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("No se pudo cerrar la sesión administrativa.", error.code || error.name);
      return next(error);
    }

    const opcionesCookie = {
      httpOnly: true,
      sameSite: process.env.SESSION_SAME_SITE || (process.env.NODE_ENV === "production" ? "none" : "lax"),
      secure: process.env.NODE_ENV === "production" && process.env.SESSION_SECURE !== "false",
      path: "/",
    };
    if (process.env.SESSION_COOKIE_DOMAIN) {
      opcionesCookie.domain = process.env.SESSION_COOKIE_DOMAIN;
    }
    res.clearCookie("michemango.sid", opcionesCookie);
    return res.json({ mensaje: "Sesión cerrada." });
  });
});

module.exports = router;
