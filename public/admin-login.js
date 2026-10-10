// Enviamos las credenciales al servidor; la contraseña nunca se guarda en el navegador.
const formularioLogin = document.getElementById("form-admin-login");
const mensajeLogin = document.getElementById("admin-login-estado");
const botonLogin = formularioLogin.querySelector('button[type="submit"]');

formularioLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    mensajeLogin.textContent = "";
    mensajeLogin.className = "contacto-estado";
    botonLogin.disabled = true;
    botonLogin.textContent = "Verificando...";

    try {
        const respuesta = await fetch("/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuario: formularioLogin.elements.usuario.value,
                contrasena: formularioLogin.elements.contrasena.value,
            }),
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            mensajeLogin.textContent = resultado.error;
            mensajeLogin.classList.add("contacto-estado--error");
            return;
        }

        window.location.assign("/admin");
    } catch {
        mensajeLogin.textContent = "No pudimos conectar con el servidor. Inténtalo de nuevo.";
        mensajeLogin.classList.add("contacto-estado--error");
    } finally {
        botonLogin.disabled = false;
        botonLogin.textContent = "Iniciar sesión";
    }
});
