const formularioLogin = document.getElementById("form-admin-login");
const mensajeLogin = document.getElementById("admin-login-estado");

if (formularioLogin) {
    formularioLogin.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const boton = formularioLogin.querySelector('button[type="submit"]');
        const datos = new FormData(formularioLogin);
        mensajeLogin.textContent = "";
        mensajeLogin.className = "contacto-estado";
        boton.disabled = true;
        boton.textContent = "Verificando...";
        const mostrandoEspera = () => {
            mensajeLogin.textContent = "Despertando el servidor, un momento...";
            mensajeLogin.className = "contacto-estado";
        };

        try {
            const respuesta = await window.MicheMango.apiFetchConDespertar("/api/admin/login", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    usuario: datos.get("usuario"),
                    contrasena: datos.get("contrasena"),
                }),
            }, mostrandoEspera);
            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(resultado.error || "No fue posible iniciar sesión.");
            }

            window.location.assign("panel.html");
        } catch (error) {
            mensajeLogin.textContent = window.MicheMango.backendDisponible === false
                ? "Estamos despertando el servidor, intenta de nuevo en un momento."
                : error.message || "No pudimos iniciar sesión en este momento. Inténtalo de nuevo.";
            mensajeLogin.classList.add("contacto-estado--error");
        } finally {
            boton.disabled = false;
            boton.textContent = "Iniciar sesión";
        }
    });
}
