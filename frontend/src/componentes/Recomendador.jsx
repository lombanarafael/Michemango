import { useEffect, useRef, useState } from "react";
import { formatCOP } from "../api.js";
import { recomendarProducto } from "../recomendador.js";

// Botón "Ayúdame a elegir" + panel flotante con el recomendador.
// Funciona en el navegador, así que responde al instante aunque el backend esté dormido.
export default function Recomendador({ productos, abierto, setAbierto, onAgregar }) {
  const [recomendacion, setRecomendacion] = useState(null);
  const botonAbrir = useRef(null);
  const selectorSabor = useRef(null);

  function cerrar() {
    setAbierto(false);
    botonAbrir.current?.focus();
  }

  // Al abrir el panel, ponemos el foco en el primer campo; con Escape se cierra.
  useEffect(() => {
    if (!abierto) return undefined;
    selectorSabor.current?.focus();
    const cerrarConEscape = (event) => {
      if (event.key === "Escape") cerrar();
    };
    document.addEventListener("keydown", cerrarConEscape);
    return () => document.removeEventListener("keydown", cerrarConEscape);
  }, [abierto]);

  function enviarPreferencias(event) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    const producto = recomendarProducto(productos, {
      sabor: datos.get("sabor"),
      tamano: datos.get("tamano"),
      ocasion: datos.get("ocasion"),
    });
    setRecomendacion(producto || false);
  }

  let claseResultado = "assistant-result";
  if (recomendacion === false) claseResultado += " assistant-result--error";
  if (recomendacion) claseResultado += " assistant-result--success";

  return (
    <>
      <button
        ref={botonAbrir}
        id="asistente-toggle"
        className="assistant-toggle"
        type="button"
        aria-expanded={abierto}
        aria-controls="asistente"
        onClick={() => setAbierto(!abierto)}
      >
        <span aria-hidden="true">🥭</span> Ayúdame a elegir
      </button>

      <section id="asistente" className="assistant-panel" aria-labelledby="asistente-titulo" hidden={!abierto}>
        <div className="assistant-heading">
          <div>
            <span className="assistant-eyebrow">Asistente MicheMango</span>
            <h2 id="asistente-titulo">¿Qué se te antoja?</h2>
          </div>
          <button className="assistant-close" type="button" aria-label="Cerrar recomendador" onClick={cerrar}>
            ×
          </button>
        </div>
        <p>Cuéntame tus gustos y ocasión; te sugeriré una opción del catálogo según tus preferencias.</p>
        <form className="assistant-form" onSubmit={enviarPreferencias}>
          <label htmlFor="preferencia-sabor">Sabor</label>
          <select ref={selectorSabor} id="preferencia-sabor" name="sabor" required>
            <option value="cualquiera">Me gustan todos</option>
            <option value="dulce">Dulce</option>
            <option value="picante">Picante</option>
            <option value="acido">Ácido</option>
            <option value="refrescante">Refrescante</option>
          </select>
          <label htmlFor="preferencia-tamano">Tamaño</label>
          <select id="preferencia-tamano" name="tamano" required>
            <option value="cualquiera">Sorpréndeme</option>
            <option value="pequeno">Pequeño</option>
            <option value="mediano">Mediano</option>
            <option value="grande">Grande</option>
          </select>
          <label htmlFor="preferencia-ocasion">¿Para qué ocasión?</label>
          <select id="preferencia-ocasion" name="ocasion" required>
            <option value="antojo">Un antojo</option>
            <option value="celebracion">Una celebración</option>
            <option value="compartir">Compartir</option>
            <option value="regalo">Un regalo</option>
            <option value="cualquiera">Cualquier momento</option>
          </select>
          <button className="contacto-button" type="submit">Recomiéndame una miche</button>
        </form>

        <div className={claseResultado} role="status" aria-live="polite">
          {recomendacion === false && "No encontramos productos para recomendar en este momento."}
          {recomendacion && (
            <>
              <span className="assistant-mode">Sugerencia según tus preferencias</span>
              <h3>{recomendacion.imagen || "🥭"} {recomendacion.nombre}</h3>
              <p>Elegido según tus preferencias y los productos del catálogo.</p>
              <p>Precio actual: {formatCOP(recomendacion.precio)}</p>
              <button
                className="pedido-button"
                type="button"
                onClick={() => {
                  onAgregar(recomendacion, 1);
                  setAbierto(false);
                }}
              >
                Agregar una unidad al pedido
              </button>
            </>
          )}
        </div>
      </section>
    </>
  );
}
