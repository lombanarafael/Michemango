import { useState } from "react";
import { formatCOP } from "../api.js";

// Tarjeta de un producto del catálogo: imagen, datos, cantidad y botón para agregar.
// Recibe por props el producto y la función que lo agrega al pedido.
export default function TarjetaProducto({ producto, onAgregar }) {
  const [cantidad, setCantidad] = useState("1");
  const numero = Number(cantidad);
  const cantidadValida = Number.isInteger(numero) && numero >= 1 && numero <= 99;
  const idCampo = `cantidad-${String(producto.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <article className="producto">
      <div className="producto-imagen">{producto.imagen || "🥭"}</div>
      <span className="producto-categoria">{producto.categoria || "General"}</span>
      <h3>{producto.nombre}</h3>
      <p>{producto.descripcion}</p>
      <h4>{formatCOP(producto.precio)}</h4>
      <label htmlFor={idCampo}>Cantidad</label>
      <input
        id={idCampo}
        className="cantidad"
        type="number"
        min="1"
        max="99"
        step="1"
        value={cantidad}
        required
        onChange={(event) => setCantidad(event.target.value)}
      />
      <p className={`subtotal-producto${cantidadValida ? "" : " subtotal-invalido"}`}>
        {cantidadValida ? `Subtotal: ${formatCOP(numero * producto.precio)}` : "Cantidad no válida (1 a 99)"}
      </p>
      <button
        className="pedido-button"
        type="button"
        disabled={!cantidadValida}
        onClick={() => onAgregar(producto, numero)}
      >
        Agregar al pedido
      </button>
    </article>
  );
}
