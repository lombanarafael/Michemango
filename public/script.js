const whatsappNumber = "573105776753";

const formatPrice = (price) => new Intl.NumberFormat("es-CO").format(price);

document.querySelectorAll(".pedido-button").forEach((button) => {
    button.addEventListener("click", () => {
        const quantityInput = document.getElementById(button.dataset.cantidad);
        const quantity = Number(quantityInput.value);

        if (!Number.isInteger(quantity) || quantity < 1) {
            quantityInput.focus();
            quantityInput.setCustomValidity("Ingresa una cantidad válida.");
            quantityInput.reportValidity();
            return;
        }

        quantityInput.setCustomValidity("");
        const product = button.dataset.producto;
        const price = Number(button.dataset.precio);
        const message = [
            "Hola, MicheMango. Quiero hacer este pedido:",
            `- ${quantity} x ${product} ($${formatPrice(price)} c/u)`,
            `Total: $${formatPrice(price * quantity)}`,
        ].join("\n");

        window.open(
            `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
            "_blank",
            "noopener,noreferrer"
        );
    });
});

// Enviamos el formulario de contacto al servidor sin recargar la página.
const formularioContacto = document.getElementById("form-contacto");

formularioContacto.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const botonEnviar = formularioContacto.querySelector('button[type="submit"]');
    const estadoContacto = document.getElementById("contacto-estado");
    const datosFormulario = new FormData(formularioContacto);

    // Limpiamos el estado anterior e indicamos que el envío está en curso.
    estadoContacto.textContent = "";
    estadoContacto.className = "contacto-estado";
    botonEnviar.disabled = true;
    botonEnviar.textContent = "Enviando...";

    try {
        const respuesta = await fetch("/api/contacto", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nombre: datosFormulario.get("nombre"),
                telefono: datosFormulario.get("telefono"),
                tipo: datosFormulario.get("tipo"),
                mensaje: datosFormulario.get("mensaje"),
            }),
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            estadoContacto.textContent = resultado.error;
            estadoContacto.classList.add("contacto-estado--error");
            return;
        }

        estadoContacto.textContent = resultado.mensaje;
        estadoContacto.classList.add("contacto-estado--exito");
        formularioContacto.reset();
    } catch {
        // Este mensaje cubre problemas de conexión o una respuesta que no se pudo leer.
        estadoContacto.textContent = "No pudimos enviar tu mensaje. Revisa tu conexión e inténtalo de nuevo.";
        estadoContacto.classList.add("contacto-estado--error");
    } finally {
        // El botón vuelve a estar disponible tanto si el envío tuvo éxito como si falló.
        botonEnviar.disabled = false;
        botonEnviar.textContent = "Enviar mensaje";
    }
});
