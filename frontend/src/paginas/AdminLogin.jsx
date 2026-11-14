import { useState } from "react";
import { apiFetchConDespertar } from "../api.js";

export default function AdminLogin() {
  const [mensaje, setMensaje] = useState({ texto: "", error: false });
  const [verificando, setVerificando] = useState(false);
  const [esperandoServidor, setEsperandoServidor] = useState(false);

  async function iniciarSesion(event) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    setMensaje({ texto: "", error: false });
    setVerificando(true);
    setEsperandoServidor(false);
    try {
      const respuesta = await apiFetchConDespertar("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: datos.get("usuario"),
          contrasena: datos.get("contrasena"),
        }),
      }, () => setEsperandoServidor(true));
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || "No fue posible iniciar sesión.");
      localStorage.setItem("michemango.adminToken", resultado.token);
      window.location.assign("/admin");
    } catch (error) {
      setMensaje({
        texto: error.message || "No pudimos iniciar sesión en este momento. Inténtalo de nuevo.",
        error: true,
      });
    } finally {
      setVerificando(false);
      setEsperandoServidor(false);
    }
  }

  return (
    <main className="admin-login">
      <a className="admin-back-link" href="/">← Volver a MicheMango</a>
      <section className="admin-card" aria-labelledby="login-titulo">
        <span className="hero-badge">Administración</span>
        <h1 id="login-titulo">Ingresar al panel</h1>
        <p>Inicia sesión para administrar el catálogo y revisar las solicitudes de MicheMango.</p>
        <form className="form-contacto" onSubmit={iniciarSesion}>
          <label htmlFor="admin-usuario">Usuario</label>
          <input id="admin-usuario" name="usuario" type="text" autoComplete="username" required />
          <label htmlFor="admin-contrasena">Contraseña</label>
          <input id="admin-contrasena" name="contrasena" type="password" autoComplete="current-password" required />
          <button className="contacto-button" type="submit" disabled={verificando}>
            {verificando ? "Verificando..." : "Iniciar sesión"}
          </button>
          <p className="contacto-estado" role="status" aria-live="polite">
            {esperandoServidor ? "Despertando el servidor, un momento..." : ""}
          </p>
          <p className={`contacto-estado${mensaje.error ? " contacto-estado--error" : ""}`} role="status" aria-live="polite">
            {mensaje.texto}
          </p>
        </form>
      </section>
    </main>
  );
}
