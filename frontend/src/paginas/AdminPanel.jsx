import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import { ruta } from "../rutas.js";
import FormProducto from "../componentes/admin/FormProducto.jsx";
import TablaProductos from "../componentes/admin/TablaProductos.jsx";
import TablaSolicitudes from "../componentes/admin/TablaSolicitudes.jsx";

// El token JWT que nos dio el login se guarda en el navegador (localStorage).
const TOKEN_KEY = "michemango.adminToken";

const PRODUCTO_VACIO = { id: "", nombre: "", categoria: "", precio: "", imagen: "micheman", descripcion: "" };

// Hace una petición a la API enviando el token en la cabecera Authorization.
// Si no hay token o ya venció (401), mandamos al administrador de vuelta al login.
async function solicitar(ruta, opciones = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.assign(ruta("/admin/login"));
    throw new Error("Inicia sesión para ver el panel.");
  }

  const respuesta = await apiFetch(ruta, {
    ...opciones,
    headers: { ...(opciones.headers || {}), Authorization: `Bearer ${token}` },
  });

  if (respuesta.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.assign(ruta("/admin/login"));
    throw new Error("Tu sesión venció. Inicia sesión de nuevo.");
  }

  const resultado = await respuesta.json();
  if (!respuesta.ok) throw new Error(resultado.error || "La solicitud al servidor falló.");
  return resultado;
}

// Zona de gestión: catálogo de productos (crear, editar, eliminar) y solicitudes recibidas.
export default function AdminPanel() {
  const [productos, setProductos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [producto, setProducto] = useState(PRODUCTO_VACIO);
  const [mensaje, setMensaje] = useState({ texto: "Cargando el panel...", error: false });

  function mostrarError(error) {
    setMensaje({ texto: error.message, error: true });
  }

  async function cargarProductos() {
    setProductos(await solicitar("/api/admin/productos"));
  }

  async function cargarSolicitudes() {
    const consulta = filtro ? `?estado=${encodeURIComponent(filtro)}` : "";
    setSolicitudes(await solicitar(`/api/admin/solicitudes${consulta}`));
  }

  // Al abrir el panel cargamos los productos una vez.
  useEffect(() => {
    cargarProductos().catch(mostrarError);
  }, []);

  // Las solicitudes se recargan cada vez que cambia el filtro.
  useEffect(() => {
    cargarSolicitudes()
      .then(() => setMensaje((actual) => (actual.error ? actual : { texto: "Productos y solicitudes cargados.", error: false })))
      .catch(mostrarError);
  }, [filtro]);

  function editarProducto(item) {
    setProducto({ ...item, categoria: item.categoria || "General", precio: String(item.precio), imagen: item.imagen || "micheman" });
    document.getElementById("form-producto")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function guardarProducto(event) {
    event.preventDefault();
    const { id, ...datos } = producto;
    try {
      // Sin id -> POST (crear). Con id -> PATCH (actualizar).
      const resultado = await solicitar(id ? `/api/admin/productos/${encodeURIComponent(id)}` : "/api/admin/productos", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: datos.nombre,
          categoria: datos.categoria,
          precio: Number(datos.precio),
          imagen: datos.imagen,
          descripcion: datos.descripcion,
        }),
      });
      setProducto(PRODUCTO_VACIO);
      await cargarProductos();
      setMensaje({ texto: resultado.mensaje || "Producto guardado.", error: false });
    } catch (error) {
      mostrarError(error);
    }
  }

  async function eliminarProducto(item) {
    if (!window.confirm(`¿Eliminar ${item.nombre} del catálogo?`)) return;
    try {
      await solicitar(`/api/admin/productos/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      setProducto(PRODUCTO_VACIO);
      await cargarProductos();
      setMensaje({ texto: "Producto eliminado del catálogo.", error: false });
    } catch (error) {
      mostrarError(error);
    }
  }

  async function cambiarEstado(solicitud, estado) {
    try {
      await solicitar(`/api/admin/solicitudes/${encodeURIComponent(solicitud.id)}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      await cargarSolicitudes();
      setMensaje({ texto: "Estado de solicitud actualizado.", error: false });
    } catch (error) {
      mostrarError(error);
    }
  }

  async function eliminarSolicitud(solicitud) {
    if (!window.confirm("¿Seguro que quieres eliminar esta solicitud?")) return;
    try {
      await solicitar(`/api/admin/solicitudes/${encodeURIComponent(solicitud.id)}`, { method: "DELETE" });
      await cargarSolicitudes();
      setMensaje({ texto: "Solicitud eliminada.", error: false });
    } catch (error) {
      mostrarError(error);
    }
  }

  function cerrarSesion() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.assign(ruta("/admin/login"));
  }

  return (
    <main className="admin-panel">
      <header className="admin-header">
        <div>
          <span className="hero-badge">MicheMango</span>
          <h1>Panel administrativo</h1>
          <p>Gestiona tus productos y revisa cada solicitud.</p>
        </div>
        <button className="admin-secondary-button" type="button" onClick={cerrarSesion}>Cerrar sesión</button>
      </header>

      <p className={`admin-message${mensaje.error ? " admin-message--error" : ""}`} role="status" aria-live="polite">
        {mensaje.texto}
      </p>

      <section className="admin-section">
        <h2>Catálogo de productos</h2>
        <FormProducto
          producto={producto}
          setProducto={setProducto}
          onGuardar={guardarProducto}
          onCancelar={() => setProducto(PRODUCTO_VACIO)}
        />
        <TablaProductos productos={productos} onEditar={editarProducto} onEliminar={eliminarProducto} />
      </section>

      <section className="admin-section">
        <h2>Solicitudes recibidas</h2>
        <TablaSolicitudes
          solicitudes={solicitudes}
          filtro={filtro}
          setFiltro={setFiltro}
          onCambiarEstado={cambiarEstado}
          onEliminar={eliminarSolicitud}
        />
      </section>
      <a className="admin-back-link" href={ruta("/")}>Volver al sitio</a>
    </main>
  );
}
