(() => {
    const apiBasePublicada = "/api";
    const override = typeof window.MICHEMANGO_API_URL === "string"
        ? window.MICHEMANGO_API_URL.trim()
        : "";
    const esLocal = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    const apiLocalHost = window.location.hostname === "::1" ? "[::1]" : window.location.hostname;
    const apiLocal = esLocal && window.location.port !== "3000" ? `http://${apiLocalHost}:3000` : "";
    const apiBaseUrl = (override || apiLocal || apiBasePublicada).replace(/\/+$/, "");

    const configuracionNegocio = {
        whatsappNumber: "573105776753",
    };

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
