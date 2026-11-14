const ESTADOS = ["nueva", "confirmada", "atendida"];

// Tabla con los mensajes que llegaron desde el formulario de contacto.
// El administrador puede filtrarlos, cambiarles el estado o eliminarlos.
export default function TablaSolicitudes({ solicitudes, filtro, setFiltro, onCambiarEstado, onEliminar }) {
  return (
    <>
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
            {solicitudes.length === 0 && <tr><td colSpan="9">Todavía no hay solicitudes.</td></tr>}
            {solicitudes.map((item) => (
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
                    onChange={(event) => onCambiarEstado(item, event.target.value)}
                  >
                    {ESTADOS.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                  </select>
                </td>
                <td>
                  <button className="admin-delete-button" type="button" onClick={() => onEliminar(item)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
