// Funciones compartidas para hablar con el backend (Express en Render).

// En internet usamos Render; en el computador usamos el servidor local (puerto 3000).
const API_PUBLICADA = import.meta.env.VITE_API_BASE_URL || "https://michemango-api.onrender.com";
const esLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_BASE = esLocal && window.location.port !== "3000"
  ? `http://${window.location.hostname}:3000`
  : esLocal ? "" : API_PUBLICADA;

const TIEMPO_LIMITE = 7000; // 7 segundos por petición
const INTENTOS_DESPERTAR = 12; // 12 intentos x 5 s = 1 minuto como máximo
const ESPERA_ENTRE_INTENTOS = 5000;

// Recordamos si el servidor ya respondió, para no despertarlo otra vez.
let servidorDespierto = false;

export const WHATSAPP_NUMBER = "573105776753";

export function formatCOP(valor) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

export function whatsappUrl(mensaje) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
}

function esperar(ms) {
  return new Promise((resolver) => window.setTimeout(resolver, ms));
}

// fetch con tiempo límite: si el servidor no contesta a tiempo, cancelamos la petición.
export async function apiFetch(ruta, opciones = {}) {
  const { timeoutMs = TIEMPO_LIMITE, ...opcionesFetch } = opciones;
  const controlador = new AbortController();
  const temporizador = window.setTimeout(() => controlador.abort(), timeoutMs);
  try {
    const respuesta = await fetch(`${API_BASE}${ruta}`, { ...opcionesFetch, signal: controlador.signal });
    servidorDespierto = respuesta.status < 500;
    return respuesta;
  } catch (error) {
    servidorDespierto = false;
    throw error;
  } finally {
    window.clearTimeout(temporizador);
  }
}

// Render Free "se duerme" tras 15 minutos sin uso y tarda cerca de un minuto en despertar.
// Preguntamos a /api/health varias veces hasta que conteste "ok".
async function despertarServidor(alEsperar) {
  for (let intento = 1; intento <= INTENTOS_DESPERTAR; intento += 1) {
    try {
      const respuesta = await apiFetch("/api/health", { cache: "no-store" });
      const estado = respuesta.ok ? await respuesta.json() : null;
      if (estado?.status === "ok") return true;
    } catch {
      // Todavía dormido: volvemos a intentar.
    }
    if (intento < INTENTOS_DESPERTAR) {
      alEsperar();
      await esperar(ESPERA_ENTRE_INTENTOS);
    }
  }
  return false;
}

// Igual que apiFetch, pero si el servidor está dormido lo despierta y vuelve a intentar.
// Lo usan el formulario de contacto y el login, que sí necesitan el backend.
export async function apiFetchConDespertar(ruta, opciones = {}, alEsperar = () => {}) {
  if (servidorDespierto) {
    try {
      const respuesta = await apiFetch(ruta, opciones);
      if (respuesta.status < 500) return respuesta;
    } catch {
      // Falló la conexión: abajo intentamos despertar el servidor.
    }
  }

  alEsperar();
  if (!(await despertarServidor(alEsperar))) {
    throw new Error("El servidor todavía no está disponible. Inténtalo en un minuto.");
  }
  return apiFetch(ruta, opciones);
}
