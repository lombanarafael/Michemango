const { randomUUID } = require("crypto");
const { pool, sqlite } = require("./data/storage");

async function leerProductos() {
  if (pool) {
    const resultado = await pool.query(
      `SELECT id, nombre, categoria, precio, descripcion, imagen
       FROM michemango_products
       ORDER BY nombre`
    );
    return resultado.rows.map((producto) => ({ ...producto, precio: Number(producto.precio) }));
  }

  return sqlite.prepare(
    `SELECT id, nombre, categoria, precio, descripcion, imagen
     FROM michemango_products
     ORDER BY nombre`
  ).all().map((producto) => ({ ...producto, precio: Number(producto.precio) }));
}

function normalizarProducto(producto, actual = null) {
  const nombre = typeof producto.nombre === "string"
    ? producto.nombre.trim()
    : actual && actual.nombre;
  const categoria = typeof producto.categoria === "string"
    ? producto.categoria.trim()
    : actual && actual.categoria;
  const descripcion = typeof producto.descripcion === "string"
    ? producto.descripcion.trim()
    : actual && actual.descripcion;
  const imagen = typeof producto.imagen === "string"
    ? producto.imagen.trim()
    : actual
      ? actual.imagen
      : "🥭";
  const precio = producto.precio === undefined && actual
    ? actual.precio
    : Number(producto.precio);

  if (
    typeof nombre !== "string" ||
    !nombre ||
    nombre.length > 80 ||
    typeof categoria !== "string" ||
    !categoria ||
    categoria.length > 40 ||
    typeof descripcion !== "string" ||
    !descripcion ||
    descripcion.length > 220 ||
    !Number.isSafeInteger(precio) ||
    precio < 1 ||
    precio > 10000000 ||
    typeof imagen !== "string" ||
    imagen.length > 20
  ) {
    const error = new Error("Revisa los campos: nombre, categoría, descripción, imagen y precio entero válido son obligatorios.");
    error.code = "INVALID_PRODUCT";
    throw error;
  }

  return { nombre, categoria, precio, descripcion, imagen: imagen || "🥭" };
}

async function crearProducto(producto) {
  const nuevoProducto = {
    id: randomUUID(),
    ...normalizarProducto(producto),
  };

  if (pool) {
    await pool.query(
      `INSERT INTO michemango_products (id, nombre, categoria, precio, descripcion, imagen)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        nuevoProducto.id,
        nuevoProducto.nombre,
        nuevoProducto.categoria,
        nuevoProducto.precio,
        nuevoProducto.descripcion,
        nuevoProducto.imagen,
      ]
    );
    return nuevoProducto;
  }

  sqlite.prepare(
    `INSERT INTO michemango_products (id, nombre, categoria, precio, descripcion, imagen)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    nuevoProducto.id,
    nuevoProducto.nombre,
    nuevoProducto.categoria,
    nuevoProducto.precio,
    nuevoProducto.descripcion,
    nuevoProducto.imagen
  );
  return nuevoProducto;
}

async function actualizarProducto(id, producto) {
  const productos = await leerProductos();
  const indice = productos.findIndex((elemento) => String(elemento.id) === String(id));

  if (indice === -1) {
    return null;
  }

  const productoActualizado = {
    id: productos[indice].id,
    ...normalizarProducto(producto, productos[indice]),
  };

  if (pool) {
    await pool.query(
      `UPDATE michemango_products
       SET nombre = $2, categoria = $3, precio = $4, descripcion = $5, imagen = $6
       WHERE id = $1`,
      [
        String(id),
        productoActualizado.nombre,
        productoActualizado.categoria,
        productoActualizado.precio,
        productoActualizado.descripcion,
        productoActualizado.imagen,
      ]
    );
    return productoActualizado;
  }

  sqlite.prepare(
    `UPDATE michemango_products
     SET nombre = ?, categoria = ?, precio = ?, descripcion = ?, imagen = ?
     WHERE id = ?`
  ).run(
    productoActualizado.nombre,
    productoActualizado.categoria,
    productoActualizado.precio,
    productoActualizado.descripcion,
    productoActualizado.imagen,
    String(id)
  );
  return productoActualizado;
}

async function eliminarProducto(id) {
  if (pool) {
    const resultado = await pool.query("DELETE FROM michemango_products WHERE id = $1", [String(id)]);
    return resultado.rowCount > 0;
  }

  const resultado = sqlite.prepare("DELETE FROM michemango_products WHERE id = ?").run(String(id));
  return resultado.changes > 0;
}

module.exports = {
  leerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
};
