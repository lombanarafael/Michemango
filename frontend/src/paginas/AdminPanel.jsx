import { useEffect, useState } from "react";
import { apiFetch, formatCOP } from "../api.js";

const TOKEN_KEY = "michemango.adminToken";

async function solicitar(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.assign("/admin/login");
    throw new Error("Inicia sesión para ver el panel.");
  }

  const respuesta = await apiFetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (respuesta.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.assign("/admin/login");
    throw new Error("Tu sesión venció. Inicia sesión de nuevo.");
  }

  const resultado = await respuesta.json();
  if (!respuesta.ok) throw new Error(resultado.error || "La solicitud al servidor falló.");
  return resultado;
}

async function cargarSolicitudes(estado) {
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : "";
  return solicitar(`/api/admin/solicitudes${query}`);
}

function nuevoProducto() {
  return {
    id: "",
    nombre: "",
    categoria: "",
    precio: "",
    imagen: "🥭",
    descripcion: "",
  };
}

export default function AdminPanel() {
  const [productos, setProductos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [producto, setProducto] = useState(nuevoProducto);
  const [mensaje, setMensaje] = useState({ texto: "Cargando el panel...", error: false });

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      window.location.replace("/admin/login");
      return;
    }
    let activo = true;
    solicitar("/api/admin/productos")
      .then((resultado) => {
        if (activo) setProductos(resultado);
      })
      .catch((error) => {
        if (activo) setMensaje({ texto: error.message, error: true });
      });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    let activo = true;
    cargarSolicitudes(filtro)
      .then((resultado) => {
        if (activo) {
          setSolicitudes(resultado);
          setMensaje((actual) => actual.error
            ? actual
            : { texto: "Productos y solicitudes cargados.", error: false });
        }
      })
      .catch((error) => {
        if (activo) setMensaje({ texto: error.message, error: true });
      });
    return () => { activo = false; };
  }, [filtro]);

  async function recargarProductos() {
    const resultado = await solicitar("/api/admin/productos");
    setProductos(resultado);
  }

  async function recargarSolicitudes() {
    const resultado = await cargarSolicitudes(filtro);
    setSolicitudes(resultado);
  }

  function limpiarFormulario() {
    setProducto(nuevoProducto());
  }

  function editarProducto(item) {
    setProducto({
      id: item.id,
      nombre: item.nombre,
      categoria: item.categoria || "General",
      precio: String(item.precio),
      imagen: item.imagen || "🥭",
      descripcion: item.descripcion,
    });
    document.getElementById("form-producto")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function guardarProducto(event) {
    event.preventDefault();
    const { id, ...datosProducto } = producto;
    try {
      const resultado = await solicitar(
        id ? `/api/admin/productos/${encodeURIComponent(id)}` : "/api/admin/productos",
        {
          method: id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...datosProducto, precio: Number(datosProducto.precio) }),
        },
      );
      limpiarFormulario();
      await recargarProductos();
      setMensaje({ texto: resultado.mensaje || "Producto guardado.", error: false });
    } catch (error) {
      setMensaje({ texto: error.message, error: true });
    }
  }

  async function eliminarProducto(item) {
    if (!window.confirm(`¿Eliminar ${item.nombre} del catálogo?`)) return;
    try {
      await solicitar(`/api/admin/productos/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      limpiarFormulario();
      await recargarProductos();
      setMensaje({ texto: "Producto eliminado del catálogo.", error: false });
    } catch (error) {
      setMensaje({ texto: error.message, error: true });
    }
  }

  async function cambiarEstado(solicitud, estado) {
    try {
      await solicitar(`/api/admin/solicitudes/${encodeURIComponent(solicitud.id)}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      await recargarSolicitudes();
      setMensaje({ texto: "Estado de solicitud actualizado.", error: false });
    } catch (error) {
      setMensaje({ texto: error.message, error: true });
    }
  }

  async function eliminarSolicitud(solicitud) {
    if (!window.confirm("¿Seguro que quieres eliminar esta solicitud?")) return;
    try {
      await solicitar(`/api/admin/solicitudes/${encodeURIComponent(solicitud.id)}`, { method: "DELETE" });
      await recargarSolicitudes();
      setMensaje({ texto: "Solicitud eliminada.", error: false });
    } catch (error) {
      setMensaje({ texto: error.message, error: true });
    }
  }

  function cerrarSesion() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.assign("/admin/login");
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
        <form id="form-producto" className="admin-product-form" onSubmit={guardarProducto}>
          <input type="hidden" name="id" value={producto.id} readOnly />
          <div className="admin-product-grid">
            <label>
              Nombre
              <input
                name="nombre"
                type="text"
                maxLength="80"
                value={producto.nombre}
                onChange={(event) => setProducto({ ...producto, nombre: event.target.value })}
                required
              />
            </label>
            <label>
              Categoría
              <input
                name="categoria"
                type="text"
                maxLength="40"
                value={producto.categoria}
                onChange={(event) => setProducto({ ...producto, categoria: event.target.value })}
                required
              />
            </label>
            <label>
              Precio (COP)
              <input
                name="precio"
                type="number"
                min="1"
                step="1000"
                value={producto.precio}
                onChange={(event) => setProducto({ ...producto, precio: event.target.value })}
                required
              />
            </label>
            <label>
              Ícono o emoji
              <input
                name="imagen"
                type="text"
                maxLength="10"
                value={producto.imagen}
                onChange={(event) => setProducto({ ...producto, imagen: event.target.value })}
              />
            </label>
          </div>
          <label>
            Descripción
            <textarea
              name="descripcion"
              rows="3"
              maxLength="220"
              value={producto.descripcion}
              onChange={(event) => setProducto({ ...producto, descripcion: event.target.value })}
              required
            />
          </label>
          <div className="admin-product-actions">
            <button className="contacto-button" type="submit">
              {producto.id ? "Actualizar producto" : "Guardar producto"}
            </button>
            <button className="admin-secondary-button" type="button" onClick={limpiarFormulario}>Cancelar</button>
          </div>
        </form>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Ícono</th>
                <th scope="col">Nombre</th>
                <th scope="col">Categoría</th>
                <th scope="col">Precio</th>
                <th scope="col">Descripción</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.length
                ? productos.map((item) => (
                  <tr key={item.id}>
                    <td>{item.imagen || "🥭"}</td>
                    <td>{item.nombre}</td>
                    <td>{item.categoria || "General"}</td>
                    <td>{formatCOP(item.precio)}</td>
                    <td>{item.descripcion}</td>
                    <td>
                      <button className="admin-secondary-button" type="button" onClick={() => editarProducto(item)}>Editar</button>{" "}
                      <button className="admin-delete-button" type="button" onClick={() => eliminarProducto(item)}>Eliminar</button>
                    </td>
                  </tr>
                ))
                : <tr><td colSpan="6">Todavía no hay productos.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>Solicitudes recibidas</h2>
        <label className="admin-filter">
          Filtrar por estado
          <select value={filtro} onChange={(event) => setFiltro(event.target.value)}>
            <option value="">Todas</option>
            <option value="nueva">Nuevas</option>
            <option value="confirmada">Confirmadas</option>
            <option value="atendida">Atendidas</option>
          </select>
        </label>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Nombre</th>
                <th scope="col">Correo</th>
                <th scope="col">Teléfono</th>
                <th scope="col">Tipo</th>
                <th scope="col">Producto de interés</th>
                <th scope="col">Mensaje</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.length
                ? solicitudes.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.fecha).toLocaleString("es-CO")}</td>
                    <td>{item.nombre}</td>
                    <td>{item.correo || "No registrado"}</td>
                    <td>{item.telefono || "No registrado"}</td>
                    <td>{String(item.tipo || "").replaceAll("_", " ")}</td>
                    <td>{item.productoInteres || "No especificado"}</td>
                    <td>{item.mensaje}</td>
                    <td>
                      <select
                        aria-label={`Estado de solicitud de ${item.nombre}`}
                        value={item.estado}
                        onChange={(event) => cambiarEstado(item, event.target.value)}
                      >
                        {["nueva", "confirmada", "atendida"].map((estado) => (
                          <option key={estado} value={estado}>{estado}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button className="admin-delete-button" type="button" onClick={() => eliminarSolicitud(item)}>Eliminar</button>
                    </td>
                  </tr>
                ))
                : <tr><td colSpan="9">Todavía no hay solicitudes.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <a className="admin-back-link" href="/">Volver al sitio</a>
    </main>
  );
}
