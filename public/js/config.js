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
    const INTENTOS_DESPERTAR = 12;
    const ESPERA_ENTRE_INTENTOS = 5000;
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

    function esperar(ms) {
        return new Promise((resolver) => window.setTimeout(resolver, ms));
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
        async reintentarBackend(onWait = () => {}) {
            for (let intento = 1; intento <= INTENTOS_DESPERTAR; intento += 1) {
                const controlador = new AbortController();
                const tiempoLimite = window.setTimeout(() => controlador.abort(), TIEMPO_LIMITE_API);
                try {
                    const respuesta = await fetch(this.apiUrl("/api/health"), {
                        cache: "no-store",
                        signal: controlador.signal,
                    });
                    const estado = respuesta.ok ? await respuesta.json() : null;
                    const disponible = estado?.status === "ok";
                    informarEstadoBackend(disponible);
                    if (disponible) {
                        window.dispatchEvent(new CustomEvent("michemango:reintentar-catalogo"));
                        return true;
                    }
                } catch {
                    informarEstadoBackend(false);
                } finally {
                    window.clearTimeout(tiempoLimite);
                }

                if (intento < INTENTOS_DESPERTAR) {
                    onWait();
                    await esperar(ESPERA_ENTRE_INTENTOS);
                }
            }
            return false;
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
        async apiFetchConDespertar(path, options = {}, onWait = () => {}) {
            if (backendDisponible !== true) {
                onWait();
                if (!await this.reintentarBackend(onWait)) {
                    throw new Error("El servidor todavía no está disponible.");
                }
            }

            try {
                const respuesta = await this.apiFetch(path, options);
                if (respuesta.status < 500) return respuesta;
            } catch {
                informarEstadoBackend(false);
            }

            onWait();
            if (!await this.reintentarBackend(onWait)) {
                throw new Error("El servidor todavía no está disponible.");
            }
            return this.apiFetch(path, options);
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
