const formularioContacto = document.getElementById("form-contacto");
const contactoProducto = document.getElementById("contacto-producto");

function actualizarProductosContacto(productos) {
    if (!contactoProducto || !Array.isArray(productos)) return;
    const seleccion = contactoProducto.value;
    contactoProducto.replaceChildren(new Option("Selecciona un producto", ""));
    productos.forEach((producto) => {
        contactoProducto.add(new Option(producto.nombre, producto.nombre));
    });
    contactoProducto.value = productos.some((producto) => producto.nombre === seleccion) ? seleccion : "";
}

window.addEventListener("michemango:catalogo-listo", (evento) => {
    actualizarProductosContacto(evento.detail.productos);
});

if (formularioContacto) {
    formularioContacto.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const botonEnviar = formularioContacto.querySelector('button[type="submit"]');
        const estadoContacto = document.getElementById("contacto-estado");
        const datos = new FormData(formularioContacto);
        const correo = String(datos.get("correo") || "").trim();
        const telefono = String(datos.get("telefono") || "").trim();
        if (!correo && !telefono) {
            estadoContacto.textContent = "Escribe un teléfono o correo para que podamos responderte.";
            estadoContacto.className = "contacto-estado contacto-estado--error";
            return;
        }
        estadoContacto.textContent = "";
        estadoContacto.className = "contacto-estado";
        botonEnviar.disabled = true;
        botonEnviar.textContent = "Enviando...";

        try {
            const respuesta = await window.MicheMango.apiFetch("/api/solicitudes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre: datos.get("nombre"),
                    correo: datos.get("correo"),
                    telefono: datos.get("telefono"),
                    tipo: datos.get("tipo"),
                    productoInteres: datos.get("productoInteres"),
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
            estadoContacto.textContent = error instanceof TypeError
                ? "No pudimos enviar tu mensaje en este momento. Inténtalo de nuevo más tarde."
                : error.message || "No pudimos enviar tu mensaje. Inténtalo de nuevo.";
            estadoContacto.classList.add("contacto-estado--error");
        } finally {
            botonEnviar.disabled = false;
            botonEnviar.textContent = "Enviar mensaje";
        }
    });
}
