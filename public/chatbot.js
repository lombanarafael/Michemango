// Controlamos el botón flotante, la ventana de chat y sus mensajes.
const botonAbrirChat = document.getElementById("chatbot-abrir");
const botonCerrarChat = document.getElementById("chatbot-cerrar");
const panelChat = document.getElementById("chatbot-panel");
const listaMensajes = document.getElementById("chatbot-mensajes");
const formularioChat = document.getElementById("chatbot-form");
const campoMensajeChat = document.getElementById("chatbot-texto");
const botonEnviarChat = formularioChat.querySelector('button[type="submit"]');
let historialChat = [];

// Mostramos el chat y enfocamos el campo para facilitar el uso con teclado.
function abrirChat() {
    panelChat.hidden = false;
    botonAbrirChat.setAttribute("aria-expanded", "true");
    campoMensajeChat.focus();
}

// Ocultamos el panel sin borrar la conversación visible.
function cerrarChat() {
    panelChat.hidden = true;
    botonAbrirChat.setAttribute("aria-expanded", "false");
    botonAbrirChat.focus();
}

// Creamos burbujas como texto plano para no interpretar mensajes como código HTML.
function agregarMensaje(texto, esDelAsistente) {
    const mensaje = document.createElement("p");
    mensaje.className = esDelAsistente
        ? "chatbot-message chatbot-message--bot"
        : "chatbot-message chatbot-message--user";
    mensaje.textContent = texto;
    listaMensajes.append(mensaje);
    listaMensajes.scrollTop = listaMensajes.scrollHeight;
    return mensaje;
}

botonAbrirChat.addEventListener("click", abrirChat);
botonCerrarChat.addEventListener("click", cerrarChat);

// Enviamos el historial reciente para que el asistente pueda entender el contexto.
formularioChat.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const mensaje = campoMensajeChat.value.trim();
    if (!mensaje) return;

    agregarMensaje(mensaje, false);
    campoMensajeChat.value = "";
    campoMensajeChat.disabled = true;
    botonEnviarChat.disabled = true;
    botonEnviarChat.textContent = "Enviando...";
    const indicadorCarga = agregarMensaje("Estoy pensando una recomendación...", true);

    const mensajesParaEnviar = [...historialChat, { role: "user", content: mensaje }]
        .slice(-9);
    if (mensajesParaEnviar[0] && mensajesParaEnviar[0].role === "assistant") {
        mensajesParaEnviar.shift();
    }

    try {
        const respuesta = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensajes: mensajesParaEnviar }),
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            indicadorCarga.remove();
            agregarMensaje(
                resultado.error || "No pudimos obtener una recomendación. Inténtalo de nuevo.",
                true
            );
            return;
        }

        indicadorCarga.remove();
        agregarMensaje(resultado.respuesta, true);
        historialChat = [
            ...mensajesParaEnviar,
            { role: "assistant", content: resultado.respuesta },
        ].slice(-9);
        if (historialChat[0] && historialChat[0].role === "assistant") {
            historialChat.shift();
        }
    } catch {
        indicadorCarga.remove();
        agregarMensaje(
            "No pudimos conectar con el recomendador. Inténtalo de nuevo o escríbenos por WhatsApp.",
            true
        );
    } finally {
        campoMensajeChat.disabled = false;
        botonEnviarChat.disabled = false;
        botonEnviarChat.textContent = "Enviar";
        campoMensajeChat.focus();
    }
});
