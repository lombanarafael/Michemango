// Formulario para crear o editar un producto. Si "producto.id" tiene valor, estamos editando.
// Es un formulario "controlado": cada campo lee y escribe en el estado del panel.
export default function FormProducto({ producto, setProducto, onGuardar, onCancelar }) {
  // Cambia un solo campo y deja los demás igual.
  const cambiar = (campo) => (event) => setProducto({ ...producto, [campo]: event.target.value });

  return (
    <form id="form-producto" className="admin-product-form" onSubmit={onGuardar}>
      <div className="admin-product-grid">
        <label>
          Nombre
          <input name="nombre" type="text" maxLength="80" value={producto.nombre} onChange={cambiar("nombre")} required />
        </label>
        <label>
          Categoría
          <input name="categoria" type="text" maxLength="40" value={producto.categoria} onChange={cambiar("categoria")} required />
        </label>
        <label>
          Precio (COP)
          <input name="precio" type="number" min="1" step="1" value={producto.precio} onChange={cambiar("precio")} required />
        </label>
        <label>
          Ícono o emoji
          <input name="imagen" type="text" maxLength="10" value={producto.imagen} onChange={cambiar("imagen")} />
        </label>
      </div>
      <label>
        Descripción
        <textarea name="descripcion" rows="3" maxLength="220" value={producto.descripcion} onChange={cambiar("descripcion")} required />
      </label>
      <div className="admin-product-actions">
        <button className="contacto-button" type="submit">
          {producto.id ? "Actualizar producto" : "Guardar producto"}
        </button>
        <button className="admin-secondary-button" type="button" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
