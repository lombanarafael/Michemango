import { formatCOP } from "../../api.js";
import ImagenProducto from "../ImagenProducto.jsx";

// Tabla con los productos guardados en la base de datos y sus botones de acción.
export default function TablaProductos({ productos, onEditar, onEliminar }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th scope="col">Imagen</th>
            <th scope="col">Nombre</th>
            <th scope="col">Categoría</th>
            <th scope="col">Precio</th>
            <th scope="col">Descripción</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.length === 0 && <tr><td colSpan="6">Todavía no hay productos.</td></tr>}
          {productos.map((item) => (
            <tr key={item.id}>
              <td><ImagenProducto producto={item} className="admin-foto" /></td>
              <td>{item.nombre}</td>
              <td>{item.categoria || "General"}</td>
              <td>{formatCOP(item.precio)}</td>
              <td>{item.descripcion}</td>
              <td>
                <button className="admin-secondary-button" type="button" onClick={() => onEditar(item)}>Editar</button>{" "}
                <button className="admin-delete-button" type="button" onClick={() => onEliminar(item)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
