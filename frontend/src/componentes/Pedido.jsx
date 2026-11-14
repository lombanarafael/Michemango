import { formatCOP, whatsappUrl } from "../api.js";

// Resumen del pedido. No se cobra nada aquí: se arma un mensaje y se abre WhatsApp.
// "pedido" es un objeto { idProducto: cantidad }.
export default function Pedido({ productos, pedido, estado, onQuitar, seccionRef }) {
  const lineas = Object.entries(pedido)
    .map(([id, cantidad]) => ({ producto: productos.find((item) => String(item.id) === id), cantidad }))
    .filter((linea) => linea.producto);
  const total = lineas.reduce((suma, { producto, cantidad }) => suma + producto.precio * cantidad, 0);

  function abrirWhatsApp() {
    const mensaje = ["Hola, MicheMango. Quiero consultar este pedido:"];
    lineas.forEach(({ producto, cantidad }) => {
      mensaje.push(`- ${producto.nombre}: ${cantidad} x ${formatCOP(producto.precio)} = ${formatCOP(producto.precio * cantidad)}`);
    });
    mensaje.push(`Total estimado: ${formatCOP(total)}`);
    mensaje.push("Este mensaje es una consulta de pedido; aún no se ha confirmado ninguna compra.");
    window.open(whatsappUrl(mensaje.join("\n")), "_blank", "noopener,noreferrer");
  }

  return (
    <section id="pedido" className="pedido-section" ref={seccionRef}>
      <h2>Tu pedido</h2>
      <p>Revisa los productos seleccionados y el total estimado antes de abrir WhatsApp.</p>
      <div className="pedido-resumen" aria-live="polite">
        {lineas.length === 0
          ? <p>Aún no has agregado productos.</p>
          : lineas.map(({ producto, cantidad }) => (
            <article className="pedido-linea" key={producto.id}>
              <strong>{producto.nombre}</strong>
              <span>{cantidad} × {formatCOP(producto.precio)}</span>
              <strong>{formatCOP(cantidad * producto.precio)}</strong>
              <button
                className="admin-delete-button"
                type="button"
                aria-label={`Quitar ${producto.nombre} del pedido`}
                onClick={() => onQuitar(String(producto.id))}
              >
                Quitar
              </button>
            </article>
          ))}
      </div>
      <div className="pedido-total">
        <strong>Total estimado</strong>
        <strong>{formatCOP(total)}</strong>
      </div>
      <button className="pedido-button" type="button" disabled={!lineas.length} onClick={abrirWhatsApp}>
        Preparar pedido en WhatsApp
      </button>
      <p className={`contacto-estado${estado.tipo ? ` contacto-estado--${estado.tipo}` : ""}`} role="status" aria-live="polite">
        {estado.texto}
      </p>
    </section>
  );
}
