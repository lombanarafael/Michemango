const contenedorCatalogo = document.getElementById("catalogo-productos");
const contenedorFiltros = document.getElementById("filtros-productos");
const contenedorPedido = document.getElementById("pedido-resumen");
const totalPedido = document.getElementById("pedido-total");
const botonPedidoWhatsApp = document.getElementById("pedido-whatsapp");
const estadoPedido = document.getElementById("pedido-estado");
let catalogo = [];
const pedido = new Map();

function crearElemento(tag, className, text) {
    const elemento = document.createElement(tag);
    if (className) elemento.className = className;
    if (text !== undefined) elemento.textContent = text;
    return elemento;
}

function actualizarSubtotalTarjeta(producto, campoCantidad, subtotal) {
    const cantidad = Number(campoCantidad.value);
    const valida = Number.isInteger(cantidad) && cantidad > 0 && cantidad <= 99;
    campoCantidad.setCustomValidity(valida ? "" : "Ingresa una cantidad entre 1 y 99.");
    subtotal.textContent = valida
        ? window.MicheMango.formatCOP(cantidad * producto.precio)
        : "Cantidad no válida";
    return valida ? cantidad : null;
}

function agregarAlPedido(id, cantidad) {
    const producto = catalogo.find((elemento) => String(elemento.id) === String(id));
    if (!producto || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) return;

    const anterior = pedido.get(String(id));
    const nuevaCantidad = (anterior ? anterior.cantidad : 0) + cantidad;
    if (nuevaCantidad > 99) {
        estadoPedido.textContent = "La cantidad máxima por producto es 99.";
        estadoPedido.className = "contacto-estado contacto-estado--error";
        return;
    }

    pedido.set(String(id), { id: producto.id, cantidad: nuevaCantidad });
    estadoPedido.textContent = `${producto.nombre} agregado al resumen.`;
    estadoPedido.className = "contacto-estado contacto-estado--exito";
    renderizarPedido();
}

function renderizarPedido() {
    if (!contenedorPedido || !totalPedido || !botonPedidoWhatsApp) return;
    contenedorPedido.replaceChildren();

    let total = 0;
    if (pedido.size === 0) {
        contenedorPedido.append(crearElemento("p", "", "Aún no has agregado productos."));
    } else {
        pedido.forEach((seleccion, id) => {
            const producto = catalogo.find((elemento) => String(elemento.id) === id);
            if (!producto) return;

            const subtotal = producto.precio * seleccion.cantidad;
            total += subtotal;
            const fila = crearElemento("article", "pedido-linea");
            fila.append(
                crearElemento("strong", "", producto.nombre),
                crearElemento("span", "", `${seleccion.cantidad} × ${window.MicheMango.formatCOP(producto.precio)}`),
                crearElemento("strong", "", window.MicheMango.formatCOP(subtotal))
            );

            const quitar = crearElemento("button", "admin-delete-button", "Quitar");
            quitar.type = "button";
            quitar.setAttribute("aria-label", `Quitar ${producto.nombre} del pedido`);
            quitar.addEventListener("click", () => {
                pedido.delete(id);
                renderizarPedido();
            });
            fila.append(quitar);
            contenedorPedido.append(fila);
        });
    }

    totalPedido.textContent = window.MicheMango.formatCOP(total);
    botonPedidoWhatsApp.disabled = pedido.size === 0;
}

function renderizarProductos(productos, categoriaActiva = "Todas") {
    if (!contenedorCatalogo) return;
    const filtrados = categoriaActiva === "Todas"
        ? productos
        : productos.filter((producto) => (producto.categoria || "General") === categoriaActiva);
    contenedorCatalogo.replaceChildren();

    if (filtrados.length === 0) {
        contenedorCatalogo.append(crearElemento("p", "catalogo-vacio", "No hay productos en esta categoría."));
        return;
    }

    filtrados.forEach((producto) => {
        const tarjeta = crearElemento("article", "producto");
        tarjeta.append(
            crearElemento("div", "producto-imagen", producto.imagen || "🥭"),
            crearElemento("span", "producto-categoria", producto.categoria || "General"),
            crearElemento("h3", "", producto.nombre),
            crearElemento("p", "", producto.descripcion),
            crearElemento("h4", "", window.MicheMango.formatCOP(producto.precio))
        );

        const label = crearElemento("label", "", "Cantidad");
        const idCampo = `cantidad-${String(producto.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        label.htmlFor = idCampo;
        const cantidad = document.createElement("input");
        cantidad.id = idCampo;
        cantidad.className = "cantidad";
        cantidad.type = "number";
        cantidad.min = "1";
        cantidad.max = "99";
        cantidad.value = "1";
        cantidad.required = true;

        const resumenSubtotal = crearElemento("p", "subtotal-producto", `Subtotal: ${window.MicheMango.formatCOP(producto.precio)}`);
        cantidad.addEventListener("input", () => {
            const valor = actualizarSubtotalTarjeta(producto, cantidad, resumenSubtotal);
            resumenSubtotal.textContent = `Subtotal: ${resumenSubtotal.textContent}`;
            if (valor === null) {
                resumenSubtotal.classList.add("subtotal-invalido");
            } else {
                resumenSubtotal.classList.remove("subtotal-invalido");
            }
        });

        const botonAgregar = crearElemento("button", "pedido-button", "Agregar al pedido");
        botonAgregar.type = "button";
        botonAgregar.addEventListener("click", () => {
            const valor = actualizarSubtotalTarjeta(producto, cantidad, resumenSubtotal);
            if (valor === null) {
                cantidad.reportValidity();
                return;
            }
            agregarAlPedido(producto.id, valor);
        });
        tarjeta.append(label, cantidad, resumenSubtotal, botonAgregar);
        contenedorCatalogo.append(tarjeta);
    });
}

function renderizarFiltros(productos) {
    if (!contenedorFiltros) return;
    contenedorFiltros.replaceChildren();
    const categorias = ["Todas", ...new Set(productos.map((producto) => producto.categoria || "General"))];

    categorias.forEach((categoria, indice) => {
        const boton = crearElemento("button", `filtro-producto${indice === 0 ? " active" : ""}`, categoria);
        boton.type = "button";
        boton.addEventListener("click", () => {
            contenedorFiltros.querySelectorAll(".filtro-producto").forEach((filtro) => {
                filtro.classList.toggle("active", filtro === boton);
            });
            renderizarProductos(productos, categoria);
        });
        contenedorFiltros.append(boton);
    });
}

async function cargarCatalogo() {
    if (!contenedorCatalogo) return;

    try {
        const respuesta = await fetch(window.MicheMango.apiUrl("/api/productos"));
        const productos = await respuesta.json();
        if (!respuesta.ok || !Array.isArray(productos)) {
            throw new Error(productos.error || "El servidor devolvió un catálogo no válido.");
        }

        catalogo = productos.filter((producto) =>
            producto &&
            (typeof producto.id === "string" || Number.isInteger(producto.id)) &&
            typeof producto.nombre === "string" &&
            Number.isFinite(Number(producto.precio)) &&
            Number(producto.precio) > 0 &&
            typeof producto.descripcion === "string"
        ).map((producto) => ({ ...producto, precio: Number(producto.precio) }));

        renderizarFiltros(catalogo);
        renderizarProductos(catalogo);
        renderizarPedido();
        window.dispatchEvent(new CustomEvent("michemango:catalogo-listo", { detail: { productos: catalogo } }));
    } catch (error) {
        contenedorCatalogo.replaceChildren(
            crearElemento("p", "catalogo-vacio", `${error.message} Comprueba la configuración de la API.`)
        );
    }
}

window.MicheMango.agregarAlPedido = agregarAlPedido;

if (botonPedidoWhatsApp) {
    botonPedidoWhatsApp.addEventListener("click", () => {
        if (pedido.size === 0) return;
        const lineas = ["Hola, MicheMango. Quiero consultar este pedido:"];
        let total = 0;

        pedido.forEach((seleccion, id) => {
            const producto = catalogo.find((elemento) => String(elemento.id) === id);
            if (!producto) return;
            const subtotal = producto.precio * seleccion.cantidad;
            total += subtotal;
            lineas.push(`- ${producto.nombre}: ${seleccion.cantidad} x ${window.MicheMango.formatCOP(producto.precio)} = ${window.MicheMango.formatCOP(subtotal)}`);
        });

        lineas.push(`Total estimado: ${window.MicheMango.formatCOP(total)}`);
        lineas.push("Este mensaje es una consulta de pedido; aún no se ha confirmado ninguna compra.");
        if (window.MicheMango.whatsappIsExample) {
            estadoPedido.textContent = "Aviso: el número de WhatsApp configurado es un ejemplo. Sustitúyelo en public/js/config.js antes de publicar.";
            estadoPedido.className = "contacto-estado contacto-estado--error";
        }
        window.open(window.MicheMango.whatsappUrl(lineas.join("\n")), "_blank", "noopener,noreferrer");
    });
}

cargarCatalogo();
