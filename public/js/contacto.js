// Enviamos el formulario al servidor y mostramos el resultado a la persona.
const formularioContacto = document.getElementById("form-contacto");
const estadoContacto = document.getElementById("contacto-estado");

formularioContacto?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const telefono = formularioContacto.elements.telefono;
    const correo = formularioContacto.elements.correo;
    const datos = new FormData(formularioContacto);
    const valorTelefono = String(datos.get("telefono") || "").trim();
    const valorCorreo = String(datos.get("correo") || "").trim();

    correo.setCustomValidity(valorTelefono || valorCorreo
        ? ""
        : "Escribe un teléfono o un correo para que podamos responderte.");
    if (!formularioContacto.reportValidity()) return;

    const boton = formularioContacto.querySelector('button[type="submit"]');
    estadoContacto.textContent = "";
    estadoContacto.className = "contacto-estado";
    boton.disabled = true;
    boton.textContent = "Enviando...";

    try {
        const headers = { "Content-Type": "application/json" };
        if (typeof crypto.randomUUID === "function") {
            headers["Idempotency-Key"] = crypto.randomUUID();
        }

        const respuesta = await window.MicheMango.apiFetchConDespertar("/api/contacto", {
            method: "POST",
            headers,
            body: JSON.stringify({
                nombre: String(datos.get("nombre") || "").trim(),
                telefono: valorTelefono,
                correo: valorCorreo,
                mensaje: String(datos.get("mensaje") || "").trim(),
                tipo: "duda",
            }),
        }, () => {
            estadoContacto.textContent = "Conectando con el servidor...";
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(resultado.error || "No pudimos enviar tu mensaje. Inténtalo de nuevo.");
        }

        formularioContacto.reset();
        estadoContacto.textContent = resultado.mensaje || "¡Mensaje enviado con éxito!";
        estadoContacto.classList.add("contacto-estado--exito");
    } catch (error) {
        estadoContacto.textContent = error.message || "No pudimos enviar tu mensaje. Inténtalo de nuevo en un momento.";
        estadoContacto.classList.add("contacto-estado--error");
    } finally {
        boton.disabled = false;
        boton.textContent = "Enviar mensaje";
    }
});
