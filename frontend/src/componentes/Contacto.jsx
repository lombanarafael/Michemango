import { useRef, useState } from "react";
import { apiFetchConDespertar, WHATSAPP_NUMBER, whatsappUrl } from "../api.js";

// Datos de contacto y formulario. Lo que se envía queda guardado en la base de datos
// (POST /api/contacto) y el administrador lo ve en su panel.
export default function Contacto() {
  const [estado, setEstado] = useState({ texto: "", tipo: "" });
  const [enviando, setEnviando] = useState(false);
  const [esperandoServidor, setEsperandoServidor] = useState(false);
  const campoCorreo = useRef(null);

  const digitos = WHATSAPP_NUMBER.slice(2); // quitamos el 57 de Colombia
  const telefonoVisible = `+57 ${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`;

  async function enviarFormulario(event) {
    event.preventDefault();
    const formulario = event.currentTarget;
    const datos = new FormData(formulario);
    const telefono = String(datos.get("telefono") || "").trim();
    const correo = String(datos.get("correo") || "").trim();

    // Pedimos al menos un teléfono o un correo para poder responder.
    campoCorreo.current.setCustomValidity(telefono || correo
      ? ""
      : "Escribe un teléfono o un correo para que podamos responderte.");
    if (!formulario.reportValidity()) return;

    setEstado({ texto: "", tipo: "" });
    setEnviando(true);
    try {
      const respuesta = await apiFetchConDespertar("/api/contacto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Un id único por mensaje: si reintentamos el envío, el servidor no lo guarda dos veces.
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          nombre: String(datos.get("nombre") || "").trim(),
          telefono,
          correo,
          mensaje: String(datos.get("mensaje") || "").trim(),
          tipo: "duda",
        }),
      }, () => setEsperandoServidor(true));
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || "No pudimos enviar tu mensaje. Inténtalo de nuevo.");
      formulario.reset();
      setEstado({ texto: resultado.mensaje || "¡Mensaje enviado con éxito!", tipo: "exito" });
    } catch (error) {
      setEstado({ texto: error.message || "No pudimos enviar tu mensaje. Inténtalo de nuevo.", tipo: "error" });
    } finally {
      setEnviando(false);
      setEsperandoServidor(false);
    }
  }

  return (
    <section id="contacto">
      <h2>Contáctanos</h2>
      <p>📱 WhatsApp: <a id="whatsapp-contacto" href={whatsappUrl("Hola, MicheMango. Quiero consultar el catálogo.")} target="_blank" rel="noopener noreferrer">{telefonoVisible}</a></p>
      <p>📍 Barranquilla - Colombia</p>
      <p className="contacto-extra">
        ¿Listo para probar tu próxima miche favorita?
        Escríbenos y prepara tu pedido.
      </p>
      <a className="button-link button-link--small" href="#pedido">Preparar pedido</a>

      <form className="form-contacto" onSubmit={enviarFormulario}>
        <h3>Envíanos un mensaje</h3>
        <label htmlFor="contacto-nombre">Nombre</label>
        <input id="contacto-nombre" name="nombre" type="text" maxLength="80" autoComplete="name" required />
        <label htmlFor="contacto-telefono">Teléfono</label>
        <input id="contacto-telefono" name="telefono" type="tel" maxLength="25" autoComplete="tel" />
        <label htmlFor="contacto-correo">Correo</label>
        <input ref={campoCorreo} id="contacto-correo" name="correo" type="email" maxLength="120" autoComplete="email" />
        <small>Déjanos un teléfono o un correo para responderte.</small>
        <label htmlFor="contacto-mensaje">Mensaje</label>
        <textarea id="contacto-mensaje" name="mensaje" rows="4" maxLength="1000" required />
        <button className="contacto-button" type="submit" disabled={enviando}>
          {enviando ? "Enviando..." : "Enviar mensaje"}
        </button>
        <p className="contacto-estado" role="status" aria-live="polite">
          {esperandoServidor ? "Conectando con el servidor..." : ""}
        </p>
        <p className={`contacto-estado${estado.tipo ? ` contacto-estado--${estado.tipo}` : ""}`} role="status" aria-live="polite">
          {estado.texto}
        </p>
      </form>
    </section>
  );
}
