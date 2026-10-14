const cuerpoSolicitudes = document.getElementById("admin-solicitudes");
const cuerpoProductos = document.getElementById("admin-productos");
const mensajeAdmin = document.getElementById("admin-estado");
const formularioProducto = document.getElementById("form-producto");
const botonCancelarProducto = document.getElementById("producto-cancelar");
const botonCerrarSesion = document.getElementById("admin-cerrar-sesion");

function mostrarMensaje(texto, esError = false) {
    mensajeAdmin.textContent = texto;
    mensajeAdmin.className = esError ? "admin-message admin-message--error" : "admin-message";
}

function crearCelda(texto) {
    const celda = document.createElement("td");
    celda.textContent = texto;
    return celda;
}

async function solicitar(path, opciones = {}) {
    const respuesta = await fetch(window.MicheMango.apiUrl(path), {
        credentials: "include",
        ...opciones,
    });

    if (respuesta.status === 401) {
        window.location.assign("login.html");
        throw new Error("La sesión venció. Inicia sesión de nuevo.");
    }

    const resultado = await respuesta.json();
    if (!respuesta.ok) {
        throw new Error(resultado.error || "La solicitud al servidor falló.");
    }
    return resultado;
}

function limpiarFormularioProducto() {
    formularioProducto.reset();
    formularioProducto.elements.id.value = "";
    formularioProducto.querySelector('button[type="submit"]').textContent = "Guardar producto";
}

async function cargarSolicitudes() {
    try {
        const filtroEstado = document.getElementById("filtro-solicitudes").value;
        const query = filtroEstado ? `?estado=${encodeURIComponent(filtroEstado)}` : "";
        const solicitudes = await solicitar(`/api/admin/solicitudes${query}`);
        cuerpoSolicitudes.replaceChildren();

        if (solicitudes.length === 0) {
            const fila = document.createElement("tr");
            const celda = crearCelda("Todavía no hay solicitudes.");
            celda.colSpan = 9;
            fila.append(celda);
            cuerpoSolicitudes.append(fila);
            return true;
        }

        solicitudes.forEach((solicitud) => {
            const fila = document.createElement("tr");
            fila.append(
                crearCelda(new Date(solicitud.fecha).toLocaleString("es-CO")),
                crearCelda(solicitud.nombre),
                crearCelda(solicitud.correo || "No registrado"),
                crearCelda(solicitud.telefono || "No registrado"),
                crearCelda(String(solicitud.tipo || "").replaceAll("_", " ")),
                crearCelda(solicitud.productoInteres || "No especificado"),
                crearCelda(solicitud.mensaje)
            );

            const celdaEstado = document.createElement("td");
            const selector = document.createElement("select");
            selector.setAttribute("aria-label", `Estado de solicitud de ${solicitud.nombre}`);
            ["nueva", "confirmada", "atendida"].forEach((estado) => {
                const opcion = document.createElement("option");
                opcion.value = estado;
                opcion.textContent = estado;
                opcion.selected = estado === solicitud.estado;
                selector.append(opcion);
            });
            selector.addEventListener("change", async () => {
                try {
                    await solicitar(`/api/admin/solicitudes/${encodeURIComponent(solicitud.id)}/estado`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ estado: selector.value }),
                    });
                    mostrarMensaje("Estado de solicitud actualizado.");
                    await cargarSolicitudes();
                } catch (error) {
                    mostrarMensaje(error.message, true);
                }
            });
            celdaEstado.append(selector);
            fila.append(celdaEstado);

            const acciones = document.createElement("td");
            const eliminar = document.createElement("button");
            eliminar.type = "button";
            eliminar.className = "admin-delete-button";
            eliminar.textContent = "Eliminar";
            eliminar.addEventListener("click", async () => {
                if (!window.confirm("¿Seguro que quieres eliminar esta solicitud?")) return;
                try {
                    await solicitar(`/api/admin/solicitudes/${encodeURIComponent(solicitud.id)}`, {
                        method: "DELETE",
                    });
                    await cargarSolicitudes();
                    mostrarMensaje("Solicitud eliminada.");
                } catch (error) {
                    mostrarMensaje(error.message, true);
                }
            });
            acciones.append(eliminar);
            fila.append(acciones);
            cuerpoSolicitudes.append(fila);
        });
        return true;
    } catch (error) {
        mostrarMensaje(error.message, true);
        return false;
    }
}

function comenzarEdicion(producto) {
    formularioProducto.elements.id.value = producto.id;
    formularioProducto.elements.nombre.value = producto.nombre;
    formularioProducto.elements.categoria.value = producto.categoria || "General";
    formularioProducto.elements.precio.value = producto.precio;
    formularioProducto.elements.imagen.value = producto.imagen || "🥭";
    formularioProducto.elements.descripcion.value = producto.descripcion;
    formularioProducto.querySelector('button[type="submit"]').textContent = "Actualizar producto";
    formularioProducto.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function cargarProductos() {
    try {
        const productos = await solicitar("/api/admin/productos");
        cuerpoProductos.replaceChildren();
        if (productos.length === 0) {
            const fila = document.createElement("tr");
            const celda = crearCelda("Todavía no hay productos.");
            celda.colSpan = 6;
            fila.append(celda);
            cuerpoProductos.append(fila);
            return true;
        }

        productos.forEach((producto) => {
            const fila = document.createElement("tr");
            fila.append(
                crearCelda(producto.imagen || "🥭"),
                crearCelda(producto.nombre),
                crearCelda(producto.categoria || "General"),
                crearCelda(window.MicheMango.formatCOP(producto.precio)),
                crearCelda(producto.descripcion)
            );

            const acciones = document.createElement("td");
            const editar = document.createElement("button");
            editar.type = "button";
            editar.className = "admin-secondary-button";
            editar.textContent = "Editar";
            editar.addEventListener("click", () => comenzarEdicion(producto));

            const eliminar = document.createElement("button");
            eliminar.type = "button";
            eliminar.className = "admin-delete-button";
            eliminar.textContent = "Eliminar";
            eliminar.addEventListener("click", async () => {
                if (!window.confirm(`¿Eliminar ${producto.nombre} del catálogo?`)) return;
                try {
                    await solicitar(`/api/admin/productos/${encodeURIComponent(producto.id)}`, {
                        method: "DELETE",
                    });
                    limpiarFormularioProducto();
                    await cargarProductos();
                    mostrarMensaje("Producto eliminado del catálogo.");
                } catch (error) {
                    mostrarMensaje(error.message, true);
                }
            });
            acciones.append(editar, eliminar);
            fila.append(acciones);
            cuerpoProductos.append(fila);
        });
        return true;
    } catch (error) {
        mostrarMensaje(error.message, true);
        return false;
    }
}

formularioProducto.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const datos = new FormData(formularioProducto);
    const id = datos.get("id");
    const producto = {
        nombre: datos.get("nombre"),
        categoria: datos.get("categoria"),
        precio: Number(datos.get("precio")),
        imagen: datos.get("imagen"),
        descripcion: datos.get("descripcion"),
    };

    try {
        const resultado = await solicitar(
            id ? `/api/admin/productos/${encodeURIComponent(id)}` : "/api/admin/productos",
            {
                method: id ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(producto),
            }
        );
        limpiarFormularioProducto();
        await cargarProductos();
        mostrarMensaje(resultado.mensaje || "Producto guardado.");
    } catch (error) {
        mostrarMensaje(error.message, true);
    }
});

botonCancelarProducto.addEventListener("click", limpiarFormularioProducto);

botonCerrarSesion.addEventListener("click", async () => {
    try {
        await solicitar("/api/admin/logout", { method: "POST" });
        window.location.assign("login.html");
    } catch (error) {
        mostrarMensaje(error.message, true);
    }
});

mostrarMensaje("Cargando el panel...");
Promise.all([cargarSolicitudes(), cargarProductos()]).then(([solicitudesOk, productosOk]) => {
    if (solicitudesOk && productosOk) {
        mostrarMensaje("Productos y solicitudes cargados.");
    }
});

document.getElementById("filtro-solicitudes").addEventListener("change", cargarSolicitudes);
