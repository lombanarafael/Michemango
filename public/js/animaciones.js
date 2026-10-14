const elementosAnimables = document.querySelectorAll("section, .producto");

if ("IntersectionObserver" in window) {
    const observador = new IntersectionObserver((entradas, observer) => {
        entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add("visible");
                observer.unobserve(entrada.target);
            }
        });
    }, { threshold: 0.12 });

    elementosAnimables.forEach((elemento) => {
        elemento.classList.add("reveal");
        observador.observe(elemento);
    });
}
