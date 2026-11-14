import { useState } from "react";
import TarjetaProducto from "./TarjetaProducto.jsx";

// Catálogo con filtros por categoría. Las categorías salen de los mismos productos.
export default function Catalogo({ productos, onAgregar }) {
  const [categoriaActiva, setCategoriaActiva] = useState("Todas");

  const categorias = ["Todas", ...new Set(productos.map((producto) => producto.categoria || "General"))];
  const productosFiltrados = categoriaActiva === "Todas"
    ? productos
    : productos.filter((producto) => (producto.categoria || "General") === categoriaActiva);

  return (
    <section id="productos">
      <h2>Nuestros Productos</h2>
      <div className="filtros-productos" aria-label="Filtros del catálogo">
        {categorias.map((categoria) => (
          <button
            key={categoria}
            className={`filtro-producto${categoriaActiva === categoria ? " active" : ""}`}
            type="button"
            aria-pressed={categoriaActiva === categoria}
            onClick={() => setCategoriaActiva(categoria)}
          >
            {categoria}
          </button>
        ))}
      </div>
      <div className="productos-container" aria-live="polite">
        {productosFiltrados.length
          ? productosFiltrados.map((producto) => (
            <TarjetaProducto key={producto.id} producto={producto} onAgregar={onAgregar} />
          ))
          : <p className="catalogo-vacio">No hay productos en esta categoría.</p>}
      </div>
    </section>
  );
}
