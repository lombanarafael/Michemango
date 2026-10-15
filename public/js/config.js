(() => {
    const apiBasePublicada = "/api";
    const override = typeof window.MICHEMANGO_API_URL === "string"
        ? window.MICHEMANGO_API_URL.trim()
        : "";
    const esLocal = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    const apiLocalHost = window.location.hostname === "::1" ? "[::1]" : window.location.hostname;
    const apiLocal = esLocal && window.location.port !== "3000" ? `http://${apiLocalHost}:3000` : "";
    const apiBaseUrl = (override || apiLocal || apiBasePublicada).replace(/\/+$/, "");
    const TIEMPO_LIMITE_API = 7000;
    let backendDisponible = null;

    const configuracionNegocio = {
        whatsappNumber: "573105776753",
    };

    function informarEstadoBackend(disponible) {
        backendDisponible = disponible;
        window.dispatchEvent(new CustomEvent("michemango:backend-estado", {
            detail: { disponible },
        }));
    }

    window.MicheMango = {
        apiBaseUrl,
        esLocal,
        get backendDisponible() {
            return backendDisponible;
        },
        whatsappNumber: configuracionNegocio.whatsappNumber,
        apiUrl(path) {
            if (!this.apiBaseUrl) {
                const mensaje = esLocal
                    ? "Inicia el servidor MicheMango en http://localhost:3000."
                    : "El servicio no está disponible en este momento.";
                throw new Error(mensaje);
            }
            const ruta = path.startsWith("/") ? path : `/${path}`;
            return this.apiBaseUrl === "/api" && ruta.startsWith("/api/")
                ? ruta
                : `${this.apiBaseUrl}${ruta}`;
        },
        informarBackendNoDisponible() {
            informarEstadoBackend(false);
        },
        async reintentarBackend() {
            const controlador = new AbortController();
            const tiempoLimite = window.setTimeout(() => controlador.abort(), TIEMPO_LIMITE_API);
            try {
                const respuesta = await fetch(this.apiUrl("/api/health"), {
                    cache: "no-store",
                    signal: controlador.signal,
                });
                if (!respuesta.ok) {
                    informarEstadoBackend(false);
                    return false;
                }
                const estado = await respuesta.json();
                const disponible = estado.status === "ok";
                informarEstadoBackend(disponible);
                if (disponible) {
                    window.dispatchEvent(new CustomEvent("michemango:reintentar-catalogo"));
                }
                return disponible;
            } catch {
                informarEstadoBackend(false);
                return false;
            } finally {
                window.clearTimeout(tiempoLimite);
            }
        },
        async apiFetch(path, options = {}) {
            const url = this.apiUrl(path);
            const { timeoutMs = TIEMPO_LIMITE_API, ...opcionesFetch } = options;
            const controlador = new AbortController();
            const tiempoLimite = window.setTimeout(() => controlador.abort(), timeoutMs);
            try {
                const respuesta = await fetch(url, { ...opcionesFetch, signal: controlador.signal });
                informarEstadoBackend(respuesta.status < 500);
                return respuesta;
            } catch (error) {
                informarEstadoBackend(false);
                throw error;
            } finally {
                window.clearTimeout(tiempoLimite);
            }
        },
        conectarFormularioBackend(formulario, mensaje) {
            if (!formulario) return;

            const aviso = document.createElement("div");
            aviso.className = "api-service-notice";
            aviso.setAttribute("role", "status");
            aviso.setAttribute("aria-live", "polite");
            const texto = document.createElement("p");
            texto.textContent = mensaje;
            const reintentar = document.createElement("button");
            reintentar.className = "api-retry-button";
            reintentar.type = "button";
            reintentar.textContent = "Reintentar";
            reintentar.addEventListener("click", async () => {
                texto.textContent = "Estamos despertando el servidor, intenta de nuevo en un momento.";
                reintentar.disabled = true;
                await this.reintentarBackend();
                reintentar.disabled = false;
            });
            aviso.append(texto, reintentar);
            aviso.hidden = true;
            formulario.insertAdjacentElement("afterend", aviso);

            const actualizar = (disponible) => {
                formulario.querySelectorAll("input, select, textarea, button").forEach((control) => {
                    control.disabled = !disponible;
                });
                aviso.hidden = disponible;
            };
            window.addEventListener("michemango:backend-estado", (evento) => actualizar(evento.detail.disponible));
            if (backendDisponible === false) actualizar(false);
        },
        formatCOP(value) {
            return new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0,
            }).format(value);
        },
        whatsappUrl(message) {
            if (!/^\d{8,15}$/.test(this.whatsappNumber)) {
                throw new Error("No hay un número de WhatsApp válido.");
            }
            return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(message)}`;
        },
    };

    const enlaceWhatsApp = document.getElementById("whatsapp-contacto");
    if (enlaceWhatsApp) {
        const digitos = configuracionNegocio.whatsappNumber.slice(2);
        enlaceWhatsApp.href = window.MicheMango.whatsappUrl("Hola, MicheMango. Quiero consultar el catálogo.");
        enlaceWhatsApp.textContent = `+57 ${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`;
    }
})();
