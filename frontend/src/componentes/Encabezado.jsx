import { useEffect, useState } from "react";

const enlaces = [
  ["Inicio", "#inicio"],
  ["Nosotros", "#nosotros"],
  ["Productos", "#productos"],
  ["Pedido", "#pedido"],
  ["Recomendador", "#asistente"],
  ["Contacto", "#contacto"],
];

// Barra superior con el logo y el menú. En celular el menú se abre con un botón.
export default function Encabezado({ onAbrirRecomendador }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [desplazado, setDesplazado] = useState(window.scrollY > 12);

  // Al bajar la página, el encabezado cambia de estilo (clase header-scrolled).
  useEffect(() => {
    const actualizar = () => setDesplazado(window.scrollY > 12);
    window.addEventListener("scroll", actualizar, { passive: true });
    return () => window.removeEventListener("scroll", actualizar);
  }, []);

  return (
    <header className={desplazado ? "header-scrolled" : ""}>
      <h1>🥭 MicheMango</h1>
      <button
        className="menu-toggle"
        type="button"
        aria-expanded={menuAbierto}
        aria-controls="navegacion-principal"
        onClick={() => setMenuAbierto(!menuAbierto)}
      >
        Menú
      </button>
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
    </header>
  );
}
