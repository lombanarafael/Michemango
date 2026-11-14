import { useEffect, useRef, useState } from "react";
import catalogoRespaldo from "../data/catalogo-respaldo.json";
import { apiFetch } from "../api.js";
import Encabezado from "../componentes/Encabezado.jsx";
import Inicio from "../componentes/Inicio.jsx";
import Nosotros from "../componentes/Nosotros.jsx";
import Catalogo from "../componentes/Catalogo.jsx";
import Pedido from "../componentes/Pedido.jsx";
import Contacto from "../componentes/Contacto.jsx";
import Recomendador from "../componentes/Recomendador.jsx";
import BotonWhatsApp from "../componentes/BotonWhatsApp.jsx";

// Página principal. Aquí vive el estado que comparten varias secciones:
// la lista de productos, el pedido y si el recomendador está abierto.
export default function Tienda() {
  // Empezamos con el catálogo de respaldo para que la página nunca salga vacía.
  const [productos, setProductos] = useState(catalogoRespaldo);
  const [pedido, setPedido] = useState({}); // { idProducto: cantidad }
  const [estadoPedido, setEstadoPedido] = useState({ texto: "", tipo: "" });
  const [recomendadorAbierto, setRecomendadorAbierto] = useState(false);
  const seccionPedido = useRef(null);

  // Al cargar, pedimos el catálogo actualizado al backend (máximo 2,5 s).
  // Si falla o está dormido, nos quedamos con el respaldo.
  useEffect(() => {
    let activo = true;
    apiFetch("/api/productos", { timeoutMs: 2500 })
      .then((respuesta) => (respuesta.ok ? respuesta.json() : []))
      .then((lista) => {
        const validos = Array.isArray(lista)
          ? lista.filter((producto) => producto?.nombre && Number(producto.precio) > 0)
          : [];
        if (activo && validos.length) {
          setProductos(validos.map((producto) => ({ ...producto, precio: Number(producto.precio) })));
        }
      })
      .catch(() => {
        // Sin conexión: seguimos mostrando el catálogo de respaldo.
      });
    return () => { activo = false; };
  }, []);

  // Animación suave: cada sección aparece cuando entra en pantalla.
  useEffect(() => {
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("visible");
          observador.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll("section, .producto").forEach((elemento) => {
      elemento.classList.add("reveal");
      observador.observe(elemento);
    });
    return () => observador.disconnect();
  }, [productos]);

  function agregarAlPedido(producto, cantidad) {
    const id = String(producto.id);
    const nuevaCantidad = (pedido[id] || 0) + cantidad;
    if (nuevaCantidad > 99) {
      setEstadoPedido({ texto: "La cantidad máxima por producto es 99.", tipo: "error" });
      return;
    }
    setPedido({ ...pedido, [id]: nuevaCantidad });
    setEstadoPedido({ texto: `${producto.nombre} agregado al resumen.`, tipo: "exito" });
  }

  function quitarDelPedido(id) {
    const copia = { ...pedido };
    delete copia[id];
    setPedido(copia);
  }

  return (
    <>
      <Encabezado onAbrirRecomendador={() => setRecomendadorAbierto(true)} />
      <main>
        <Inicio />
        <Nosotros />
        <Catalogo productos={productos} onAgregar={agregarAlPedido} />
        <Pedido
          productos={productos}
          pedido={pedido}
          estado={estadoPedido}
          onQuitar={quitarDelPedido}
          seccionRef={seccionPedido}
        />
        <Contacto />
      </main>

      <footer>
        <p className="footer-marca">🥭 MicheMango</p>
        <p>Miches de mango hechas con amor en Barranquilla.</p>
        <p className="footer-copy">© 2026 MicheMango - Todos los derechos reservados.</p>
      </footer>

      <Recomendador
        productos={productos}
        abierto={recomendadorAbierto}
        setAbierto={setRecomendadorAbierto}
        onAgregar={(producto, cantidad) => {
          agregarAlPedido(producto, cantidad);
          seccionPedido.current?.scrollIntoView({ behavior: "smooth" });
        }}
      />
      <BotonWhatsApp />
    </>
  );
}
