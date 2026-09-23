const whatsappNumber = "573105776753";

const formatPrice = (price) => new Intl.NumberFormat("es-CO").format(price);

document.querySelectorAll(".pedido-button").forEach((button) => {
    button.addEventListener("click", () => {
        const quantityInput = document.getElementById(button.dataset.cantidad);
        const quantity = Number(quantityInput.value);

        if (!Number.isInteger(quantity) || quantity < 1) {
            quantityInput.focus();
            quantityInput.setCustomValidity("Ingresa una cantidad válida.");
            quantityInput.reportValidity();
            return;
        }

        quantityInput.setCustomValidity("");
        const product = button.dataset.producto;
        const price = Number(button.dataset.precio);
        const message = [
            "Hola, MicheMango. Quiero hacer este pedido:",
            `- ${quantity} x ${product} ($${formatPrice(price)} c/u)`,
            `Total: $${formatPrice(price * quantity)}`,
        ].join("\n");

        window.open(
            `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
            "_blank",
            "noopener,noreferrer"
        );
    });
});
