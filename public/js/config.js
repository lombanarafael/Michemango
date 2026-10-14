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
        whatsappNumber: "573105776753",
    };

    window.MicheMango = {
        apiBaseUrl,
        whatsappNumber: configuracionNegocio.whatsappNumber,
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
                throw new Error("No hay un número de WhatsApp válido configurado.");
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
