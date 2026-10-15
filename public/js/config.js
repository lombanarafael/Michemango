(() => {
    const apiBasePublicada = "/api";
    const override = typeof window.MICHEMANGO_API_URL === "string"
        ? window.MICHEMANGO_API_URL.trim()
        : "";
    const esLocal = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    const apiLocalHost = window.location.hostname === "::1" ? "[::1]" : window.location.hostname;
    const apiLocal = esLocal && window.location.port !== "3000" ? `http://${apiLocalHost}:3000` : "";
    const apiBaseUrl = (override || apiLocal || apiBasePublicada).replace(/\/+$/, "");
    const TIEMPO_ENTRE_COMPROBACIONES = 4 * 60 * 1000;
    const INTENTOS_DESPERTAR = 12;
    let apiListaHasta = 0;
    let despertarEnCurso = null;

    const configuracionNegocio = {
        whatsappNumber: "573105776753",
    };

    function mostrarAvisoServidor(mensaje) {
        let aviso = document.getElementById("api-wakeup-notice");
        if (!aviso) {
            aviso = document.createElement("div");
            aviso.id = "api-wakeup-notice";
            aviso.className = "api-wakeup-notice";
            aviso.setAttribute("role", "status");
            aviso.setAttribute("aria-live", "polite");
            document.body.prepend(aviso);
        }
        aviso.textContent = mensaje;
        aviso.hidden = false;
    }

    function ocultarAvisoServidor() {
        document.getElementById("api-wakeup-notice")?.remove();
    }

    function esperar(ms) {
        return new Promise((resolver) => window.setTimeout(resolver, ms));
    }

    window.MicheMango = {
        apiBaseUrl,
        esLocal,
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
        async apiFetch(path, options = {}) {
            const url = this.apiUrl(path);

            if (Date.now() >= apiListaHasta) {
                if (!despertarEnCurso) {
                    despertarEnCurso = (async () => {
                        let ultimoError;
                        for (let intento = 1; intento <= INTENTOS_DESPERTAR; intento += 1) {
                            const controlador = new AbortController();
                            const tiempoLimite = window.setTimeout(() => controlador.abort(), 10000);
                            try {
                                const respuesta = await fetch(this.apiUrl("/api/health"), {
                                    cache: "no-store",
                                    signal: controlador.signal,
                                });
                                if (respuesta.ok) {
                                    const estado = await respuesta.json();
                                    if (estado.status === "ok") {
                                        apiListaHasta = Date.now() + TIEMPO_ENTRE_COMPROBACIONES;
                                        ocultarAvisoServidor();
                                        return;
                                    }
                                }
                                ultimoError = new Error(`HTTP ${respuesta.status}`);
                            } catch (error) {
                                ultimoError = error;
                            } finally {
                                window.clearTimeout(tiempoLimite);
                            }

                            if (esLocal) {
                                throw new Error("Inicia el servidor MicheMango en http://localhost:3000.");
                            }

                            mostrarAvisoServidor("Despertando el servidor, un momento...");
                            if (intento < INTENTOS_DESPERTAR) {
                                await esperar(3000);
                            }
                        }

                        ocultarAvisoServidor();
                        console.error("El servidor no respondió tras varios intentos.", ultimoError);
                        throw new Error("El servidor está tardando en responder. Inténtalo de nuevo en un momento.");
                    })().finally(() => {
                        despertarEnCurso = null;
                    });
                }
                await despertarEnCurso;
            }

            return fetch(url, options);
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
