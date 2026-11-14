const API_BASE_PUBLICADA = import.meta.env.VITE_API_BASE_URL || "https://michemango-api.onrender.com";
const esLocal = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
const hostApiLocal = window.location.hostname === "::1" ? "[::1]" : window.location.hostname;
const apiLocal = esLocal && window.location.port !== "3000"
  ? `http://${hostApiLocal}:3000`
  : "";
const apiBaseUrl = (apiLocal || (esLocal && window.location.port === "3000" ? "" : API_BASE_PUBLICADA))
  .replace(/\/+$/, "");
const TIMEOUT_API = 7000;
const INTENTOS_DESPERTAR = 12;
const ESPERA_ENTRE_INTENTOS = 5000;
let backendDisponible = null;

export const WHATSAPP_NUMBER = "573105776753";

function informarEstadoBackend(disponible) {
  backendDisponible = disponible;
  window.dispatchEvent(new CustomEvent("michemango:backend-estado", {
    detail: { disponible },
  }));
}

function esperar(ms) {
  return new Promise((resolver) => window.setTimeout(resolver, ms));
}

export function apiUrl(path) {
  const ruta = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${ruta}`;
}

export function formatCOP(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function whatsappUrl(message) {
  if (!/^\d{8,15}$/.test(WHATSAPP_NUMBER)) {
    throw new Error("No hay un número de WhatsApp válido.");
  }
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export async function reintentarBackend(onWait = () => {}) {
  for (let intento = 1; intento <= INTENTOS_DESPERTAR; intento += 1) {
    const controlador = new AbortController();
    const tiempoLimite = window.setTimeout(() => controlador.abort(), TIMEOUT_API);
    try {
      const respuesta = await fetch(apiUrl("/api/health"), {
        cache: "no-store",
        signal: controlador.signal,
      });
      const estado = respuesta.ok ? await respuesta.json() : null;
      const disponible = estado?.status === "ok";
      informarEstadoBackend(disponible);
      if (disponible) return true;
    } catch {
      informarEstadoBackend(false);
    } finally {
      window.clearTimeout(tiempoLimite);
    }

    if (intento < INTENTOS_DESPERTAR) {
      onWait();
      await esperar(ESPERA_ENTRE_INTENTOS);
    }
  }
  return false;
}

export async function apiFetch(path, options = {}) {
  const { timeoutMs = TIMEOUT_API, ...opcionesFetch } = options;
  const controlador = new AbortController();
  const tiempoLimite = window.setTimeout(() => controlador.abort(), timeoutMs);
  try {
    const respuesta = await fetch(apiUrl(path), {
      ...opcionesFetch,
      signal: controlador.signal,
    });
    informarEstadoBackend(respuesta.status < 500);
    return respuesta;
  } catch (error) {
    informarEstadoBackend(false);
    throw error;
  } finally {
    window.clearTimeout(tiempoLimite);
  }
}

export async function apiFetchConDespertar(path, options = {}, onWait = () => {}) {
  if (backendDisponible !== true) {
    onWait();
    if (!await reintentarBackend(onWait)) {
      throw new Error("El servidor todavía no está disponible.");
    }
  }

  try {
    const respuesta = await apiFetch(path, options);
    if (respuesta.status < 500) return respuesta;
  } catch {
    informarEstadoBackend(false);
  }

  onWait();
  if (!await reintentarBackend(onWait)) {
    throw new Error("El servidor todavía no está disponible.");
  }
  return apiFetch(path, options);
}
