import { useEffect, useMemo, useRef, useState } from "react";
import catalogoRespaldo from "./data/catalogo-respaldo.json";
import {
  apiFetch,
  apiFetchConDespertar,
  formatCOP,
  WHATSAPP_NUMBER,
  whatsappUrl,
} from "./api.js";

const enlaces = [
  ["Inicio", "#inicio"],
  ["Nosotros", "#nosotros"],
  ["Productos", "#productos"],
  ["Pedido", "#pedido"],
  ["Recomendador", "#asistente"],
  ["Contacto", "#contacto"],
];

function Header({ onAbrirAsistente }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [desplazado, setDesplazado] = useState(window.scrollY > 12);

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
        onClick={() => setMenuAbierto((abierto) => !abierto)}
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
              if (href === "#asistente") {
                event.preventDefault();
                onAbrirAsistente();
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

function recomendarProducto(productos, preferencias) {
  const puntuados = productos.map((producto) => {
    const texto = `${producto.nombre} ${producto.categoria} ${producto.descripcion}`.toLocaleLowerCase("es-CO");
    let puntos = 0;

    if (preferencias.sabor === "picante" && /picante|taj[ií]n|chamoy/.test(texto)) puntos += 4;
    if (preferencias.sabor === "picante" && String(producto.categoria || "").toLocaleLowerCase("es-CO") === "picante") puntos += 2;
    if (preferencias.sabor === "dulce" && /dulce|gomitas|fruta|premium/.test(texto)) puntos += 3;
    if (preferencias.sabor === "acido" && /lim[oó]n|maracuy[aá]|[aá]cid/.test(texto)) puntos += 3;
    if (preferencias.sabor === "refrescante" && /fresco|refrescante|lim[oó]n/.test(texto)) puntos += 3;

    const esPequeno = /mini|pequeñ/.test(texto);
    const esGrande = /premium|explosivo/.test(texto);
    if (preferencias.tamano === "pequeno") puntos += esPequeno ? 4 : -1;
    if (preferencias.tamano === "mediano") puntos += esPequeno ? -2 : esGrande ? 1 : 3;
    if (preferencias.tamano === "grande") puntos += esGrande ? 4 : -1;
    if (preferencias.ocasion === "celebracion") puntos += esGrande ? 3 : 0;
    if (preferencias.ocasion === "compartir") puntos += esGrande ? 2 : 0;
    if (preferencias.ocasion === "regalo") puntos += esGrande ? 3 : 0;
    if (preferencias.ocasion === "antojo") puntos += esPequeno || /cl[aá]sico/.test(texto) ? 2 : 0;

    return { producto, puntos };
  });

  puntuados.sort((a, b) => b.puntos - a.puntos || a.producto.precio - b.producto.precio);
  return puntuados[0]?.producto;
}

function ProductCard({ producto, onAgregar }) {
  const [cantidad, setCantidad] = useState("1");
  const campoCantidad = useRef(null);
  const numeroCantidad = Number(cantidad);
  const cantidadValida = Number.isInteger(numeroCantidad) && numeroCantidad >= 1 && numeroCantidad <= 99;

  return (
    <article className="producto">
      <div className="producto-imagen">{producto.imagen || "🥭"}</div>
      <span className="producto-categoria">{producto.categoria || "General"}</span>
      <h3>{producto.nombre}</h3>
      <p>{producto.descripcion}</p>
      <h4>{formatCOP(producto.precio)}</h4>
      <label htmlFor={`cantidad-${String(producto.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`}>Cantidad</label>
      <input
        id={`cantidad-${String(producto.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`}
        className="cantidad"
        type="number"
        min="1"
        max="99"
        step="1"
        value={cantidad}
        required
        ref={campoCantidad}
        onChange={(event) => setCantidad(event.target.value)}
      />
      <p className={`subtotal-producto${cantidadValida ? "" : " subtotal-invalido"}`}>
        {cantidadValida ? `Subtotal: ${formatCOP(numeroCantidad * producto.precio)}` : "Cantidad no válida"}
      </p>
      <button
        className="pedido-button"
        type="button"
        onClick={(event) => {
          if (!campoCantidad.current.reportValidity() || !cantidadValida) return;
          onAgregar(producto, numeroCantidad);
        }}
      >
        Agregar al pedido
      </button>
    </article>
  );
}

function Storefront() {
  const [productos, setProductos] = useState(catalogoRespaldo);
  const [categoriaActiva, setCategoriaActiva] = useState("Todas");
  const [pedido, setPedido] = useState({});
  const [estadoPedido, setEstadoPedido] = useState({ texto: "", tipo: "" });
  const [menuAsistente, setMenuAsistente] = useState(false);
  const [recomendacion, setRecomendacion] = useState(null);
  const [estadoContacto, setEstadoContacto] = useState({ texto: "", tipo: "" });
  const [enviandoContacto, setEnviandoContacto] = useState(false);
  const [esperandoServidor, setEsperandoServidor] = useState(false);
  const botonAsistente = useRef(null);
  const selectorSabor = useRef(null);
  const correoContacto = useRef(null);
  const pedidoSection = useRef(null);

  const categorias = useMemo(
    () => ["Todas", ...new Set(productos.map((producto) => producto.categoria || "General"))],
    [productos],
  );
  const productosFiltrados = useMemo(
    () => categoriaActiva === "Todas"
      ? productos
      : productos.filter((producto) => (producto.categoria || "General") === categoriaActiva),
    [productos, categoriaActiva],
  );

  useEffect(() => {
    let activo = true;
    apiFetch("/api/productos", { timeoutMs: 2500 })
      .then(async (respuesta) => {
        const resultado = await respuesta.json();
        if (!respuesta.ok || !Array.isArray(resultado)) {
          throw new Error("El servidor no devolvió un catálogo válido.");
        }
        const validos = resultado.filter((producto) =>
          producto &&
          (typeof producto.id === "string" || Number.isInteger(producto.id)) &&
          typeof producto.nombre === "string" &&
          Number.isFinite(Number(producto.precio)) &&
          Number(producto.precio) > 0 &&
          typeof producto.descripcion === "string",
        ).map((producto) => ({ ...producto, precio: Number(producto.precio) }));
        if (!validos.length) throw new Error("El servidor devolvió un catálogo vacío.");
        if (activo) setProductos(validos);
      })
      .catch(() => {
        if (activo) window.dispatchEvent(new CustomEvent("michemango:backend-estado", {
          detail: { disponible: false },
        }));
      });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if ("IntersectionObserver" in window) {
      const observador = new IntersectionObserver((entradas, observer) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add("visible");
            observer.unobserve(entrada.target);
          }
        });
      }, { threshold: 0.12 });
      document.querySelectorAll("section, .producto").forEach((elemento) => {
        elemento.classList.add("reveal");
        observador.observe(elemento);
      });
      return () => observador.disconnect();
    }
    return undefined;
  }, [productosFiltrados]);

  useEffect(() => {
    if (menuAsistente) selectorSabor.current?.focus();
  }, [menuAsistente]);

  useEffect(() => {
    if (!menuAsistente) return undefined;
    const cerrarConEscape = (event) => {
      if (event.key === "Escape") {
        setMenuAsistente(false);
        botonAsistente.current?.focus();
      }
    };
    document.addEventListener("keydown", cerrarConEscape);
    return () => document.removeEventListener("keydown", cerrarConEscape);
  }, [menuAsistente]);

  const totalPedido = productos.reduce((total, producto) => (
    total + producto.precio * (pedido[String(producto.id)] || 0)
  ), 0);

  function agregarAlPedido(producto, cantidad) {
    const id = String(producto.id);
    const nuevaCantidad = (pedido[id] || 0) + cantidad;
    if (nuevaCantidad > 99) {
      setEstadoPedido({ texto: "La cantidad máxima por producto es 99.", tipo: "error" });
      return;
    }
    setPedido((actual) => ({ ...actual, [id]: nuevaCantidad }));
    setEstadoPedido({ texto: `${producto.nombre} agregado al resumen.`, tipo: "exito" });
  }

  function quitarDelPedido(id) {
    setPedido((actual) => {
      const siguiente = { ...actual };
      delete siguiente[id];
      return siguiente;
    });
  }

  function prepararPedidoWhatsApp() {
    if (!Object.keys(pedido).length) return;
    const lineas = ["Hola, MicheMango. Quiero consultar este pedido:"];
    productos.forEach((producto) => {
      const cantidad = pedido[String(producto.id)];
      if (!cantidad) return;
      const subtotal = producto.precio * cantidad;
      lineas.push(`- ${producto.nombre}: ${cantidad} x ${formatCOP(producto.precio)} = ${formatCOP(subtotal)}`);
    });
    lineas.push(`Total estimado: ${formatCOP(totalPedido)}`);
    lineas.push("Este mensaje es una consulta de pedido; aún no se ha confirmado ninguna compra.");
    try {
      window.open(whatsappUrl(lineas.join("\n")), "_blank", "noopener,noreferrer");
    } catch (error) {
      setEstadoPedido({ texto: error.message, tipo: "error" });
    }
  }

  async function enviarContacto(event) {
    event.preventDefault();
    const formulario = event.currentTarget;
    const datos = new FormData(formulario);
    const telefono = String(datos.get("telefono") || "").trim();
    const correo = String(datos.get("correo") || "").trim();
    correoContacto.current.setCustomValidity(telefono || correo
      ? ""
      : "Escribe un teléfono o un correo para que podamos responderte.");
    if (!formulario.reportValidity()) return;

    setEstadoContacto({ texto: "", tipo: "" });
    setEnviandoContacto(true);
    setEsperandoServidor(false);
    try {
      const headers = { "Content-Type": "application/json" };
      if (typeof crypto.randomUUID === "function") headers["Idempotency-Key"] = crypto.randomUUID();
      const respuesta = await apiFetchConDespertar("/api/contacto", {
        method: "POST",
        headers,
        body: JSON.stringify({
          nombre: String(datos.get("nombre") || "").trim(),
          telefono,
          correo,
          mensaje: String(datos.get("mensaje") || "").trim(),
          tipo: "duda",
        }),
      }, () => setEsperandoServidor(true));
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || "No pudimos enviar tu mensaje. Inténtalo de nuevo.");
      formulario.reset();
      setEstadoContacto({ texto: resultado.mensaje || "¡Mensaje enviado con éxito!", tipo: "exito" });
    } catch (error) {
      setEstadoContacto({
        texto: error.message || "No pudimos enviar tu mensaje. Inténtalo de nuevo en un momento.",
        tipo: "error",
      });
    } finally {
      setEnviandoContacto(false);
      setEsperandoServidor(false);
    }
  }

  function enviarRecomendacion(event) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    const producto = recomendarProducto(productos, {
      sabor: datos.get("sabor"),
      tamano: datos.get("tamano"),
      ocasion: datos.get("ocasion"),
    });
    setRecomendacion(producto || false);
  }

  const digitosWhatsApp = WHATSAPP_NUMBER.slice(2);
  const enlaceWhatsApp = {
    href: whatsappUrl("Hola, MicheMango. Quiero consultar el catálogo."),
    texto: `+57 ${digitosWhatsApp.slice(0, 3)} ${digitosWhatsApp.slice(3, 6)} ${digitosWhatsApp.slice(6)}`,
  };

  return (
    <>
      <Header onAbrirAsistente={() => setMenuAsistente(true)} />
      <main>
        <section id="inicio">
          <span className="hero-badge">Sabor tropical en cada preparacion</span>
          <h2>¡Bienvenidos a MicheMango!</h2>
          <p>
            Disfruta el auténtico sabor del mango en una deliciosa miche preparada
            con ingredientes frescos, combinaciones irresistibles y ese toque
            colombiano que convierte cada momento en una celebración.
          </p>
          <a className="button-link" href="#productos">Ver productos</a>
          <div className="beneficios" aria-label="Lo que nos diferencia">
            <span>🥭 Mango fresco</span>
            <span>✨ Preparación artesanal</span>
            <span>💛 Hecho con amor</span>
          </div>
        </section>

        <section id="nosotros">
          <h2>¿Quiénes somos?</h2>
          <div className="nosotros-grid">
            <div>
              <p>
                Somos un emprendimiento barranquillero apasionado por transformar
                el mango en momentos de alegría. En MicheMango combinamos fruta
                fresca, ingredientes de calidad y preparaciones hechas al momento
                para que cada vaso tenga un sabor único.
              </p>
              <p>
                Nos encanta crear mezclas dulces, ácidas y picantes que se
                adapten a todos los gustos. Ya sea para compartir con amigos,
                celebrar una ocasión especial o simplemente darte un gusto,
                aquí siempre encontrarás una miche preparada con cariño.
              </p>
            </div>
            <div className="nosotros-destacado">
              <strong>¡Más que una preparación!</strong>
              <span>Una experiencia tropical, fresca y muy nuestra.</span>
            </div>
          </div>
        </section>

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
                <ProductCard key={producto.id} producto={producto} onAgregar={agregarAlPedido} />
              ))
              : <p className="catalogo-vacio">No hay productos en esta categoría.</p>}
          </div>
        </section>

        <section id="pedido" className="pedido-section" ref={pedidoSection}>
          <h2>Tu pedido</h2>
          <p>Revisa los productos seleccionados y el total estimado antes de abrir WhatsApp.</p>
          <div className="pedido-resumen" aria-live="polite">
            {Object.keys(pedido).length === 0
              ? <p>Aún no has agregado productos.</p>
              : Object.entries(pedido).map(([id, cantidad]) => {
                const producto = productos.find((item) => String(item.id) === id);
                if (!producto) return null;
                return (
                  <article className="pedido-linea" key={id}>
                    <strong>{producto.nombre}</strong>
                    <span>{cantidad} × {formatCOP(producto.precio)}</span>
                    <strong>{formatCOP(cantidad * producto.precio)}</strong>
                    <button
                      className="admin-delete-button"
                      type="button"
                      aria-label={`Quitar ${producto.nombre} del pedido`}
                      onClick={() => quitarDelPedido(id)}
                    >
                      Quitar
                    </button>
                  </article>
                );
              })}
          </div>
          <div className="pedido-total">
            <strong>Total estimado</strong>
            <strong>{formatCOP(totalPedido)}</strong>
          </div>
          <button
            className="pedido-button"
            type="button"
            disabled={!Object.keys(pedido).length}
            onClick={prepararPedidoWhatsApp}
          >
            Preparar pedido en WhatsApp
          </button>
          <p className={`contacto-estado${estadoPedido.tipo ? ` contacto-estado--${estadoPedido.tipo}` : ""}`} role="status" aria-live="polite">
            {estadoPedido.texto}
          </p>
        </section>

        <section id="contacto">
          <h2>Contáctanos</h2>
          <p>📱 WhatsApp: <a id="whatsapp-contacto" href={enlaceWhatsApp.href} target="_blank" rel="noopener noreferrer">{enlaceWhatsApp.texto}</a></p>
          <p>📍 Barranquilla - Colombia</p>
          <p className="contacto-extra">
            ¿Listo para probar tu próxima miche favorita?
            Escríbenos y prepara tu pedido.
          </p>
          <a className="button-link button-link--small" href="#pedido">Preparar pedido</a>

          <form className="form-contacto" onSubmit={enviarContacto}>
            <h3>Envíanos un mensaje</h3>
            <label htmlFor="contacto-nombre">Nombre</label>
            <input id="contacto-nombre" name="nombre" type="text" maxLength="80" autoComplete="name" required />
            <label htmlFor="contacto-telefono">Teléfono</label>
            <input id="contacto-telefono" name="telefono" type="tel" maxLength="25" autoComplete="tel" />
            <label htmlFor="contacto-correo">Correo</label>
            <input ref={correoContacto} id="contacto-correo" name="correo" type="email" maxLength="120" autoComplete="email" />
            <small>Déjanos un teléfono o un correo para responderte.</small>
            <label htmlFor="contacto-mensaje">Mensaje</label>
            <textarea id="contacto-mensaje" name="mensaje" rows="4" maxLength="1000" required />
            <button className="contacto-button" type="submit" disabled={enviandoContacto}>
              {enviandoContacto ? "Enviando..." : "Enviar mensaje"}
            </button>
            <p className="contacto-estado" role="status" aria-live="polite">
              {esperandoServidor ? "Conectando con el servidor..." : ""}
            </p>
            <p className={`contacto-estado${estadoContacto.tipo ? ` contacto-estado--${estadoContacto.tipo}` : ""}`} role="status" aria-live="polite">
              {estadoContacto.texto}
            </p>
          </form>
        </section>
      </main>

      <footer>
        <p>© 2026 MicheMango - Todos los derechos reservados.</p>
        <a className="admin-back-link" href="/admin/login">Acceso administrativo</a>
      </footer>

      <button
        ref={botonAsistente}
        id="asistente-toggle"
        className="assistant-toggle"
        type="button"
        aria-expanded={menuAsistente}
        aria-controls="asistente"
        onClick={() => setMenuAsistente((abierto) => !abierto)}
      >
        <span aria-hidden="true">🥭</span> Ayúdame a elegir
      </button>
      <section id="asistente" className="assistant-panel" aria-labelledby="asistente-titulo" hidden={!menuAsistente}>
        <div className="assistant-heading">
          <div>
            <span className="assistant-eyebrow">Asistente MicheMango</span>
            <h2 id="asistente-titulo">¿Qué se te antoja?</h2>
          </div>
          <button
            className="assistant-close"
            type="button"
            aria-label="Cerrar recomendador"
            onClick={() => {
              setMenuAsistente(false);
              botonAsistente.current?.focus();
            }}
          >
            ×
          </button>
        </div>
        <p>Cuéntame tus gustos y ocasión; te sugeriré una opción del catálogo según tus preferencias.</p>
        <form className="assistant-form" onSubmit={enviarRecomendacion}>
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
        <div className={`assistant-result${recomendacion === false ? " assistant-result--error" : recomendacion ? " assistant-result--success" : ""}`} role="status" aria-live="polite">
          {recomendacion === false
            ? "No encontramos productos para recomendar en este momento."
            : recomendacion && (
              <>
                <span className="assistant-mode">Sugerencia según tus preferencias</span>
                <h3>{recomendacion.imagen || "🥭"} {recomendacion.nombre}</h3>
                <p>Elegido según tus preferencias y los productos del catálogo.</p>
                <p>Precio actual: {formatCOP(recomendacion.precio)}</p>
                <button
                  className="pedido-button"
                  type="button"
                  onClick={() => {
                    agregarAlPedido(recomendacion, 1);
                    pedidoSection.current?.scrollIntoView({ behavior: "smooth" });
                    setMenuAsistente(false);
                  }}
                >
                  Agregar una unidad al pedido
                </button>
              </>
            )}
        </div>
      </section>
      <button
        id="whatsapp-flotante"
        className="whatsapp-float"
        type="button"
        aria-label="Consultar por WhatsApp"
        onClick={() => {
          try {
            window.open(whatsappUrl("Hola, MicheMango. Quiero consultar el catálogo."), "_blank", "noopener,noreferrer");
          } catch (error) {
            setEstadoPedido({ texto: error.message, tipo: "error" });
            pedidoSection.current?.scrollIntoView({ behavior: "smooth" });
          }
        }}
      >
        <span aria-hidden="true">◉</span> WhatsApp
      </button>
    </>
  );
}

export default Storefront;
