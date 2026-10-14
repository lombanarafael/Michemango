// Estas rutas muestran el acceso y las páginas privadas del panel de administración.
const express = require("express");
const bcrypt = require("bcryptjs");
const { requiereAdmin } = require("../middleware/requiereAdmin");

const router = express.Router();
const OPCIONES_COOKIE = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 1000,
};

// Las páginas son estáticas para GitHub Pages; la sesión sigue validándose en el servidor.
router.get("/login", (req, res) => {
  if (req.session && req.session.admin === true) {
    return res.redirect("/admin/panel.html");
  }

  return res.redirect("/admin/login.html");
});

// Comparamos usuario y contraseña con los datos configurados en el archivo .env.
router.post("/login", async (req, res) => {
  const usuario = typeof req.body?.usuario === "string" ? req.body.usuario : "";
  const contrasena = typeof req.body?.contrasena === "string" ? req.body.contrasena : "";

  if (!usuario || !contrasena || contrasena.length > 200) {
    return res.status(400).json({ error: "Escribe el usuario y la contraseña." });
  }

  try {
    const contrasenaCorrecta = await bcrypt.compare(
      contrasena,
      process.env.ADMIN_PASSWORD_HASH
    );
    const usuarioCorrecto = usuario === process.env.ADMIN_USERNAME;

    if (!usuarioCorrecto || !contrasenaCorrecta) {
      return res.status(401).json({ error: "El usuario o la contraseña no son correctos." });
    }
  } catch (error) {
    console.error("No se pudo comprobar la contraseña del administrador:", error);
    return res.status(500).json({ error: "No pudimos validar el acceso en este momento." });
  }

  // Renovamos el identificador de sesión al iniciar sesión para evitar reutilizar uno anterior.
  req.session.regenerate((error) => {
    if (error) {
      console.error("No se pudo iniciar la sesión de administración:", error);
      return res.status(500).json({ error: "No pudimos iniciar la sesión en este momento." });
    }

    req.session.admin = true;
    req.session.save((errorAlGuardar) => {
      if (errorAlGuardar) {
        console.error("No se pudo guardar la sesión de administración:", errorAlGuardar);
        return res.status(500).json({ error: "No pudimos guardar la sesión en este momento." });
      }

      return res.json({ mensaje: "Sesión iniciada." });
    });
  });
});

// Protegemos la página principal del panel; sin sesión se redirige a la pantalla de acceso.
router.get("/", requiereAdmin, (req, res) => {
  res.redirect("/admin/panel.html");
});

// Cerramos la sesión y borramos la cookie del navegador.
router.post("/logout", requiereAdmin, (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("No se pudo cerrar la sesión de administración:", error);
      return res.status(500).json({ error: "No pudimos cerrar la sesión en este momento." });
    }

    res.clearCookie("michemango.sid", {
      httpOnly: OPCIONES_COOKIE.httpOnly,
      sameSite: OPCIONES_COOKIE.sameSite,
      secure: OPCIONES_COOKIE.secure,
    });
    return res.json({ mensaje: "Sesión cerrada." });
  });
});

module.exports = router;
