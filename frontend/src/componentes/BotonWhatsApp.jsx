import { whatsappUrl } from "../api.js";

// Botón flotante que abre un chat de WhatsApp con el negocio.
export default function BotonWhatsApp() {
  return (
    <a
      id="whatsapp-flotante"
      className="whatsapp-float"
      href={whatsappUrl("Hola, MicheMango. Quiero consultar el catálogo.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Consultar por WhatsApp"
    >
      <span aria-hidden="true">◉</span> WhatsApp
    </a>
  );
}
