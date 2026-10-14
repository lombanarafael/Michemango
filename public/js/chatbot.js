const formularioRecomendador = document.getElementById("form-recomendador");
const contenedorRecomendaciones = document.getElementById("recomendaciones");
let productosParaRecomendar = [];

const palabrasPorPreferencia = {
    dulce: ["dulce", "gomitas", "fruta", "premium"],
    acido: ["ácid", "acido", "limón", "limon", "maracuyá", "maracuya"],
    picante: ["picante", "chamoy", "tajín", "tajin"],
    refrescante: ["refrescante", "limón", "limon", "mango fresco"],
};

function puntuarProducto(producto, preferencia) {
    if (preferencia === "cualquiera") return 1;
    const texto = `${producto.nombre} ${producto.categoria || ""} ${producto.descripcion}`.toLocaleLowerCase("es");
    return palabrasPorPreferencia[preferencia].reduce((puntos, palabra) =>
        puntos + (texto.includes(palabra) ? 1 : 0), 0
    );
}

function mostrarRecomendaciones(productos) {
    if (!contenedorRecomendaciones) return;
    contenedorRecomendaciones.replaceChildren();

    if (productos.length === 0) {
        const sinResultados = document.createElement("p");
        sinResultados.className = "catalogo-vacio";
        sinResultados.textContent = "No encontramos productos que coincidan con ese presupuesto. Prueba con un valor mayor o consulta por WhatsApp.";
        contenedorRecomendaciones.append(sinResultados);
        return;
    }

    productos.forEach((producto) => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "recomendacion-card";
        const titulo = document.createElement("h3");
        titulo.textContent = `${producto.imagen || "🥭"} ${producto.nombre}`;
        const detalle = document.createElement("p");
        detalle.textContent = `${producto.descripcion} Precio: ${window.MicheMango.formatCOP(producto.precio)}.`;
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "pedido-button";
        boton.textContent = "Agregar una unidad al pedido";
        boton.addEventListener("click", () => {
            window.MicheMango.agregarAlPedido(producto.id, 1);
            document.getElementById("pedido")?.scrollIntoView({ behavior: "smooth" });
        });
        tarjeta.append(titulo, detalle, boton);
        contenedorRecomendaciones.append(tarjeta);
    });
}

window.addEventListener("michemango:catalogo-listo", (evento) => {
    productosParaRecomendar = evento.detail.productos;
});

if (formularioRecomendador) {
    formularioRecomendador.addEventListener("submit", (evento) => {
        evento.preventDefault();
        const preferencia = formularioRecomendador.elements.sabor.value;
        const presupuesto = formularioRecomendador.elements.presupuesto.value.trim();
        const maximo = presupuesto === "" ? Infinity : Number(presupuesto);

        if (!Number.isFinite(maximo) && maximo !== Infinity || maximo < 0) {
            formularioRecomendador.elements.presupuesto.setCustomValidity("Escribe un presupuesto válido.");
            formularioRecomendador.elements.presupuesto.reportValidity();
            return;
        }
        formularioRecomendador.elements.presupuesto.setCustomValidity("");

        const sugerencias = productosParaRecomendar
            .filter((producto) => producto.precio <= maximo)
            .map((producto) => ({ producto, puntos: puntuarProducto(producto, preferencia) }))
            .filter((resultado) => preferencia === "cualquiera" || resultado.puntos > 0)
            .sort((a, b) => b.puntos - a.puntos || a.producto.precio - b.producto.precio)
            .slice(0, 3)
            .map((resultado) => resultado.producto);

        mostrarRecomendaciones(sugerencias);
    });
}
