import { useEffect, useRef, useState } from "react";
import { ruta } from "../rutas.js";

const enlaces = [
  ["Inicio", "#inicio"],
  ["Nosotros", "#nosotros"],
  ["Productos", "#productos"],
  ["Pedido", "#pedido"],
  ["Recomendador", "#asistente"],
  ["Contacto", "#contacto"],
];

// Barra superior: logo, menú de secciones y, en la esquina, el botón ⋮ con el acceso del admin.
// En celular el menú de secciones se abre con el botón "Menú".
export default function Encabezado({ onAbrirRecomendador }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [opcionesAbiertas, setOpcionesAbiertas] = useState(false);
  const [desplazado, setDesplazado] = useState(window.scrollY > 12);
  const cajaOpciones = useRef(null);

  // Al bajar la página, el encabezado se vuelve más compacto (clase header-scrolled).
  useEffect(() => {
    const actualizar = () => setDesplazado(window.scrollY > 12);
    window.addEventListener("scroll", actualizar, { passive: true });
    return () => window.removeEventListener("scroll", actualizar);
  }, []);

  // El menú ⋮ se cierra al hacer clic fuera de él o al presionar Escape.
  useEffect(() => {
    if (!opcionesAbiertas) return undefined;
    const cerrarSiEsFuera = (event) => {
      if (!cajaOpciones.current?.contains(event.target)) setOpcionesAbiertas(false);
    };
    const cerrarConEscape = (event) => {
      if (event.key === "Escape") setOpcionesAbiertas(false);
    };
    document.addEventListener("click", cerrarSiEsFuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("click", cerrarSiEsFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [opcionesAbiertas]);

  return (
    <header className={desplazado ? "header-scrolled" : ""}>
      <h1 className="marca">
        <a href="#inicio"><span aria-hidden="true">🥭</span> MicheMango</a>
      </h1>

      <nav id="navegacion-principal" className={menuAbierto ? "nav-open" : ""}>
        {enlaces.map(([texto, href]) => (
          <a
            key={href}
            href={href}
            onClick={(event) => {
              setMenuAbierto(false);
              // El recomendador es un panel flotante, no una sección: lo abrimos.
              if (href === "#asistente") {
                event.preventDefault();
                onAbrirRecomendador();
              }
            }}
          >
            {texto}
          </a>
        ))}
      </nav>

      <div className="header-acciones">
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuAbierto}
          aria-controls="navegacion-principal"
          onClick={() => setMenuAbierto(!menuAbierto)}
        >
          Menú
        </button>

        <div className="menu-opciones" ref={cajaOpciones}>
          <button
            className="boton-puntos"
            type="button"
            aria-label="Más opciones"
            aria-haspopup="menu"
            aria-expanded={opcionesAbiertas}
            onClick={() => setOpcionesAbiertas(!opcionesAbiertas)}
          >
            ⋮
          </button>
          {opcionesAbiertas && (
            <div className="menu-desplegable" role="menu">
              <a role="menuitem" href={ruta("/admin/login")}>
                <span aria-hidden="true">🔒</span> Acceso administrativo
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
