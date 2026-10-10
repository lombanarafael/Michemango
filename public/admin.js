// Mostramos los errores en la página sin insertar contenido recibido como HTML.
const cuerpoSolicitudes = document.getElementById("admin-solicitudes");
const mensajeAdmin = document.getElementById("admin-estado");
const botonCerrarSesion = document.getElementById("admin-cerrar-sesion");

function mostrarMensaje(texto, esError = false) {
    mensajeAdmin.textContent = texto;
    mensajeAdmin.className = esError ? "admin-message admin-message--error" : "admin-message";
}

// Si la sesión ya venció, llevamos al administrador a la pantalla de ingreso.
function revisarSesion(respuesta) {
    if (respuesta.status === 401) {
        window.location.assign("/admin/login");
        return true;
    }

    return false;
}

// Creamos una celda usando textContent para que los datos del formulario se muestren como texto.
function crearCelda(texto) {
    const celda = document.createElement("td");
    celda.textContent = texto;
    return celda;
}

// Cargamos las solicitudes privadas y construimos una fila para cada una.
async function cargarSolicitudes() {
    mostrarMensaje("Cargando solicitudes...");

    try {
        const respuesta = await fetch("/api/admin/solicitudes");
        if (revisarSesion(respuesta)) return;

        const solicitudes = await respuesta.json();
        if (!respuesta.ok) {
            throw new Error(solicitudes.error || "No pudimos cargar las solicitudes.");
        }

        cuerpoSolicitudes.replaceChildren();
        if (solicitudes.length === 0) {
            const filaVacia = document.createElement("tr");
            const celdaVacia = crearCelda("Todavía no hay solicitudes.");
            celdaVacia.colSpan = 6;
            filaVacia.append(celdaVacia);
            cuerpoSolicitudes.append(filaVacia);
            mostrarMensaje("");
            return;
        }

        solicitudes.forEach((solicitud) => {
            const fila = document.createElement("tr");
            const fecha = new Date(solicitud.fecha).toLocaleString("es-CO");
            const tipo = solicitud.tipo.replaceAll("_", " ");
            fila.append(
                crearCelda(fecha),
                crearCelda(`${solicitud.nombre}\n${solicitud.telefono}`),
                crearCelda(tipo),
                crearCelda(solicitud.mensaje)
            );

            const celdaEstado = document.createElement("td");
            const selectorEstado = document.createElement("select");
            selectorEstado.setAttribute("aria-label", `Estado de solicitud de ${solicitud.nombre}`);
            ["nueva", "atendida"].forEach((estado) => {
                const opcion = document.createElement("option");
                opcion.value = estado;
                opcion.textContent = estado;
                opcion.selected = estado === solicitud.estado;
                selectorEstado.append(opcion);
            });
            selectorEstado.addEventListener("change", () => {
                actualizarEstado(solicitud.id, selectorEstado.value);
            });
            celdaEstado.append(selectorEstado);
            fila.append(celdaEstado);

            const celdaAcciones = document.createElement("td");
            const botonEliminar = document.createElement("button");
            botonEliminar.type = "button";
            botonEliminar.className = "admin-delete-button";
            botonEliminar.textContent = "Eliminar";
            botonEliminar.addEventListener("click", () => eliminarSolicitud(solicitud.id));
            celdaAcciones.append(botonEliminar);
            fila.append(celdaAcciones);

            cuerpoSolicitudes.append(fila);
        });

        mostrarMensaje(`${solicitudes.length} solicitud(es) en total.`);
    } catch {
        mostrarMensaje("No pudimos cargar las solicitudes. Revisa la conexión e inténtalo de nuevo.", true);
    }
}

// Guardamos el nuevo estado y volvemos a cargar la tabla para mostrar el resultado.
async function actualizarEstado(id, estado) {
    try {
        const respuesta = await fetch(`/api/admin/solicitudes/${encodeURIComponent(id)}/estado`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado }),
        });
        if (revisarSesion(respuesta)) return;

        const resultado = await respuesta.json();
        if (!respuesta.ok) {
            throw new Error(resultado.error || "No pudimos actualizar el estado.");
        }

        await cargarSolicitudes();
    } catch {
        mostrarMensaje("No pudimos actualizar el estado. Inténtalo de nuevo.", true);
    }
}

// Pedimos confirmación antes de borrar y actualizamos la lista después.
async function eliminarSolicitud(id) {
    if (!window.confirm("¿Seguro que quieres eliminar esta solicitud?")) return;

    try {
        const respuesta = await fetch(`/api/admin/solicitudes/${encodeURIComponent(id)}`, {
            method: "DELETE",
        });
        if (revisarSesion(respuesta)) return;

        const resultado = await respuesta.json();
        if (!respuesta.ok) {
            throw new Error(resultado.error || "No pudimos eliminar la solicitud.");
        }

        await cargarSolicitudes();
    } catch {
        mostrarMensaje("No pudimos eliminar la solicitud. Inténtalo de nuevo.", true);
    }
}

// La sesión se destruye en el servidor antes de volver al formulario de ingreso.
botonCerrarSesion.addEventListener("click", async () => {
    try {
        const respuesta = await fetch("/admin/logout", { method: "POST" });
        if (!respuesta.ok) {
            throw new Error("El servidor no pudo cerrar la sesión.");
        }

        window.location.assign("/admin/login");
    } catch {
        mostrarMensaje("No pudimos cerrar la sesión. Inténtalo de nuevo.", true);
    }
});

cargarSolicitudes();
