const botonAsistente = document.getElementById("asistente-toggle");
const panelAsistente = document.getElementById("asistente-panel");
const botonCerrarAsistente = document.getElementById("asistente-cerrar");
const formularioAsistente = document.getElementById("form-recomendador");
const resultadoAsistente = document.getElementById("recomendacion-resultado");
const botonWhatsAppFlotante = document.getElementById("whatsapp-flotante");
let productosRecomendables = Array.isArray(window.MicheMangoCatalogoRespaldo)
    ? window.MicheMangoCatalogoRespaldo
    : [];

window.addEventListener("michemango:catalogo-listo", (evento) => {
    if (Array.isArray(evento.detail?.productos) && evento.detail.productos.length > 0) {
        productosRecomendables = evento.detail.productos;
    }
});

function recomendarProducto(preferencias) {
    const puntuados = productosRecomendables.map((producto) => {
        const texto = `${producto.nombre} ${producto.categoria} ${producto.descripcion}`.toLocaleLowerCase("es-CO");
        let puntos = 0;

        if (preferencias.sabor === "picante" && /picante|taj[ií]n|chamoy/.test(texto)) puntos += 4;
        if (preferencias.sabor === "picante" && String(producto.categoria || "").toLocaleLowerCase("es-CO") === "picante") puntos += 2;
        if (preferencias.sabor === "dulce" && /dulce|gomitas|fruta|premium/.test(texto)) puntos += 3;
        if (preferencias.sabor === "acido" && /lim[oó]n|maracuy[aá]|[aá]cid/.test(texto)) puntos += 3;
        if (preferencias.sabor === "refrescante" && /fresco|refrescante|lim[oó]n/.test(texto)) puntos += 3;

        const esPequeno = /mini|pequeñ/.test(texto);
        const esGrande = /premium|explosivo/.test(texto);
        if (preferencias.tamano === "pequeno") puntos += esPequeno ? 4 : -1;
        if (preferencias.tamano === "mediano") puntos += esPequeno ? -2 : esGrande ? 1 : 3;
        if (preferencias.tamano === "grande") puntos += esGrande ? 4 : -1;
        if (preferencias.ocasion === "celebracion") puntos += esGrande ? 3 : 0;
        if (preferencias.ocasion === "compartir") puntos += esGrande ? 2 : 0;
        if (preferencias.ocasion === "regalo") puntos += esGrande ? 3 : 0;
        if (preferencias.ocasion === "antojo") puntos += esPequeno || /cl[aá]sico/.test(texto) ? 2 : 0;

        return { producto, puntos };
    });

    puntuados.sort((a, b) => b.puntos - a.puntos || a.producto.precio - b.producto.precio);
    return puntuados[0]?.producto;
}

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

formularioAsistente?.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const datos = new FormData(formularioAsistente);
    const producto = recomendarProducto({
        sabor: datos.get("sabor"),
        tamano: datos.get("tamano"),
        ocasion: datos.get("ocasion"),
    });
    resultadoAsistente.className = "assistant-result";

    if (!producto) {
        resultadoAsistente.textContent = "No encontramos productos para recomendar en este momento.";
        resultadoAsistente.classList.add("assistant-result--error");
        return;
    }

    resultadoAsistente.replaceChildren();
    const etiquetaModo = document.createElement("span");
    etiquetaModo.className = "assistant-mode";
    etiquetaModo.textContent = "Sugerencia según tus preferencias";
    const nombre = document.createElement("h3");
    nombre.textContent = `${producto.imagen || "🥭"} ${producto.nombre}`;
    const motivo = document.createElement("p");
    motivo.textContent = "Elegido según tus preferencias y los productos del catálogo.";
    const precio = document.createElement("p");
    precio.textContent = `Precio actual: ${window.MicheMango.formatCOP(producto.precio)}`;
    const agregar = document.createElement("button");
    agregar.type = "button";
    agregar.className = "pedido-button";
    agregar.textContent = "Agregar una unidad al pedido";
    agregar.addEventListener("click", () => {
        window.MicheMango.agregarAlPedido(producto.id, 1);
        document.getElementById("pedido")?.scrollIntoView({ behavior: "smooth" });
        abrirAsistente(false);
    });
    resultadoAsistente.append(etiquetaModo, nombre, motivo, precio, agregar);
    resultadoAsistente.classList.add("assistant-result--success");
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
