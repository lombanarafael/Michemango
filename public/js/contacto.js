const formularioContacto = document.getElementById("form-contacto");

if (formularioContacto) {
    formularioContacto.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const botonEnviar = formularioContacto.querySelector('button[type="submit"]');
        const estadoContacto = document.getElementById("contacto-estado");
        const datos = new FormData(formularioContacto);
        estadoContacto.textContent = "";
        estadoContacto.className = "contacto-estado";
        botonEnviar.disabled = true;
        botonEnviar.textContent = "Enviando...";

        try {
            const respuesta = await fetch(window.MicheMango.apiUrl("/api/contacto"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre: datos.get("nombre"),
                    correo: datos.get("correo"),
                    telefono: datos.get("telefono"),
                    tipo: datos.get("tipo"),
                    mensaje: datos.get("mensaje"),
                }),
            });
            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(resultado.error || "No pudimos registrar tu solicitud.");
            }

            estadoContacto.textContent = `${resultado.mensaje} Código de seguimiento: ${resultado.solicitud.id}`;
            estadoContacto.classList.add("contacto-estado--exito");
            formularioContacto.reset();
        } catch (error) {
            estadoContacto.textContent = error.message || "No pudimos enviar tu mensaje. Revisa la conexión e inténtalo de nuevo.";
            estadoContacto.classList.add("contacto-estado--error");
        } finally {
            botonEnviar.disabled = false;
            botonEnviar.textContent = "Enviar mensaje";
        }
    });
}
