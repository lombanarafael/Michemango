const menuCabecera = document.querySelector("header");

if (menuCabecera) {
    const enlacesNavegacion = menuCabecera.querySelector("nav");

    if (enlacesNavegacion) {
        const botonMenu = document.createElement("button");
        botonMenu.type = "button";
        botonMenu.className = "menu-toggle";
        botonMenu.textContent = "Menú";
        botonMenu.setAttribute("aria-expanded", "false");
        botonMenu.setAttribute("aria-controls", "navegacion-principal");
        enlacesNavegacion.id = "navegacion-principal";
        menuCabecera.insertBefore(botonMenu, enlacesNavegacion);

        botonMenu.addEventListener("click", () => {
            const abierto = botonMenu.getAttribute("aria-expanded") === "true";
            botonMenu.setAttribute("aria-expanded", String(!abierto));
            enlacesNavegacion.classList.toggle("nav-open", !abierto);
        });

        enlacesNavegacion.addEventListener("click", (evento) => {
            if (evento.target instanceof HTMLAnchorElement) {
                botonMenu.setAttribute("aria-expanded", "false");
                enlacesNavegacion.classList.remove("nav-open");
            }
        });
    }

    window.addEventListener("scroll", () => {
        menuCabecera.classList.toggle("header-scrolled", window.scrollY > 12);
    }, { passive: true });
}
