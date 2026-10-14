(() => {
    // Sustituye esta URL por el origen HTTPS del backend al publicar en GitHub Pages.
    const apiBasePublicada = "";
    const override = typeof window.MICHEMANGO_API_URL === "string"
        ? window.MICHEMANGO_API_URL.trim()
        : "";
    const apiLocal = window.location.hostname === "localhost"
        ? "http://localhost:3000"
        : window.location.hostname === "127.0.0.1"
            ? "http://127.0.0.1:3000"
            : "";
    const apiBaseUrl = (override || apiBasePublicada || apiLocal).replace(/\/+$/, "");

    const configuracionNegocio = {
        whatsappNumber: "TODO_CONFIRMAR",
        preciosOficiales: {
            "Micheman": "TODO_CONFIRMAR",
            "Miche Premium": "TODO_CONFIRMAR",
            "Mango Explosivo": "TODO_CONFIRMAR",
            "Mini Miche": "TODO_CONFIRMAR",
        },
    };

    window.MicheMango = {
        apiBaseUrl,
        whatsappNumber: configuracionNegocio.whatsappNumber,
        preciosConfirmados: false,
        apiUrl(path) {
            if (!this.apiBaseUrl) {
                throw new Error("Configura la URL del backend en apiBasePublicada dentro de public/js/config.js.");
            }
            return `${this.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
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
                throw new Error("El número de WhatsApp sigue pendiente de confirmación.");
            }
            return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(message)}`;
        },
    };
})();
