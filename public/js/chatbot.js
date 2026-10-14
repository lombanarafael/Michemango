const botonAsistente = document.getElementById("asistente-toggle");
const panelAsistente = document.getElementById("asistente-panel");
const botonCerrarAsistente = document.getElementById("asistente-cerrar");
const formularioAsistente = document.getElementById("form-recomendador");
const resultadoAsistente = document.getElementById("recomendacion-resultado");
const botonWhatsAppFlotante = document.getElementById("whatsapp-flotante");

function abrirAsistente(abierto) {
    if (!botonAsistente || !panelAsistente) return;
    panelAsistente.hidden = !abierto;
    botonAsistente.setAttribute("aria-expanded", String(abierto));
    if (abierto) {
        panelAsistente.querySelector("select")?.focus();
    } else {
        botonAsistente.focus();
    }
}

botonAsistente?.addEventListener("click", () => {
    abrirAsistente(panelAsistente.hidden);
});
botonCerrarAsistente?.addEventListener("click", () => abrirAsistente(false));
document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && panelAsistente && !panelAsistente.hidden) {
        abrirAsistente(false);
    }
});

formularioAsistente?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const botonEnviar = formularioAsistente.querySelector('button[type="submit"]');
    const datos = new FormData(formularioAsistente);
    botonEnviar.disabled = true;
    botonEnviar.textContent = "Buscando tu miche...";
    resultadoAsistente.textContent = "Estoy revisando el catálogo y tus preferencias.";
    resultadoAsistente.className = "assistant-result";

    try {
        const respuesta = await fetch(window.MicheMango.apiUrl("/api/recomendaciones"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sabor: datos.get("sabor"),
                tamano: datos.get("tamano"),
                ocasion: datos.get("ocasion"),
            }),
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok) {
            throw new Error(resultado.error || "No pudimos generar una recomendación.");
        }

        resultadoAsistente.replaceChildren();
        const etiquetaModo = document.createElement("span");
        etiquetaModo.className = "assistant-mode";
        etiquetaModo.textContent = resultado.modo === "ia" ? "Sugerencia con IA" : "Sugerencia por reglas";
        const nombre = document.createElement("h3");
        nombre.textContent = `${resultado.producto.imagen || "🥭"} ${resultado.producto.nombre}`;
        const motivo = document.createElement("p");
        motivo.textContent = resultado.motivo;
        const precio = document.createElement("p");
        precio.textContent = `Precio actual: ${window.MicheMango.formatCOP(resultado.producto.precio)}`;
        const aviso = document.createElement("small");
        aviso.textContent = resultado.aviso;
        const agregar = document.createElement("button");
        agregar.type = "button";
        agregar.className = "pedido-button";
        agregar.textContent = "Agregar una unidad al pedido";
        agregar.addEventListener("click", () => {
            window.MicheMango.agregarAlPedido(resultado.producto.id, 1);
            document.getElementById("pedido")?.scrollIntoView({ behavior: "smooth" });
            abrirAsistente(false);
        });
        resultadoAsistente.append(etiquetaModo, nombre, motivo, precio, aviso, agregar);
        resultadoAsistente.classList.add("assistant-result--success");
    } catch (error) {
        resultadoAsistente.textContent = window.MicheMango.esLocal && error.message
            ? error.message
            : "No pudimos generar una recomendación en este momento. Inténtalo de nuevo.";
        resultadoAsistente.classList.add("assistant-result--error");
    } finally {
        botonEnviar.disabled = false;
        botonEnviar.textContent = "Recomiéndame una miche";
    }
});

botonWhatsAppFlotante?.addEventListener("click", () => {
    try {
        window.open(
            window.MicheMango.whatsappUrl("Hola, MicheMango. Quiero consultar el catálogo."),
            "_blank",
            "noopener,noreferrer"
        );
    } catch (error) {
        const estado = document.getElementById("pedido-estado");
        estado.textContent = error.message;
        estado.className = "contacto-estado contacto-estado--error";
        document.getElementById("pedido")?.scrollIntoView({ behavior: "smooth" });
    }
});
