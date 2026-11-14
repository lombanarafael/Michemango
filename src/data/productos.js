// Operaciones de la tabla de productos (catálogo).
const { randomUUID } = require("crypto");
const { consulta } = require("./baseDatos");

async function leerProductos() {
  const { rows } = await consulta(
    "SELECT id, nombre, categoria, precio, descripcion, imagen FROM michemango_products ORDER BY nombre",
  );
  return rows.map((producto) => ({ ...producto, precio: Number(producto.precio) }));
}

// Revisa y limpia los datos que envía el panel admin antes de guardarlos.
// Al editar, "actual" trae el producto guardado para conservar los campos que no cambian.
function normalizarProducto(datos, actual = {}) {
  const texto = (campo) => (typeof datos[campo] === "string" ? datos[campo].trim() : actual[campo]);
  const producto = {
    nombre: texto("nombre"),
    categoria: texto("categoria"),
    descripcion: texto("descripcion"),
    imagen: texto("imagen") || "micheman",
    precio: datos.precio === undefined ? actual.precio : Number(datos.precio),
  };

  const valido =
    typeof producto.nombre === "string" && producto.nombre && producto.nombre.length <= 80 &&
    typeof producto.categoria === "string" && producto.categoria && producto.categoria.length <= 40 &&
    typeof producto.descripcion === "string" && producto.descripcion && producto.descripcion.length <= 220 &&
    producto.imagen.length <= 20 &&
    Number.isSafeInteger(producto.precio) && producto.precio >= 1 && producto.precio <= 10000000;

  if (!valido) {
    const error = new Error("Revisa los campos: nombre, categoría, descripción, imagen y precio entero válido son obligatorios.");
    error.code = "INVALID_PRODUCT"; // la ruta usa este código para responder 400 en vez de 500
    throw error;
  }
  return producto;
}

async function crearProducto(datos) {
  const producto = { id: randomUUID(), ...normalizarProducto(datos) };
  await consulta(
    `INSERT INTO michemango_products (id, nombre, categoria, precio, descripcion, imagen)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [producto.id, producto.nombre, producto.categoria, producto.precio, producto.descripcion, producto.imagen],
  );
  return producto;
}

// Devuelve null si el producto no existe.
async function actualizarProducto(id, datos) {
  const { rows } = await consulta(
    "SELECT id, nombre, categoria, precio, descripcion, imagen FROM michemango_products WHERE id = $1",
    [String(id)],
  );
  if (!rows[0]) return null;

  const producto = { id: rows[0].id, ...normalizarProducto(datos, { ...rows[0], precio: Number(rows[0].precio) }) };
  await consulta(
    `UPDATE michemango_products
     SET nombre = $1, categoria = $2, precio = $3, descripcion = $4, imagen = $5
     WHERE id = $6`,
    [producto.nombre, producto.categoria, producto.precio, producto.descripcion, producto.imagen, producto.id],
  );
  return producto;
}

// Devuelve true si el producto existía y se borró.
async function eliminarProducto(id) {
  const { rowCount } = await consulta("DELETE FROM michemango_products WHERE id = $1", [String(id)]);
  return rowCount > 0;
}

module.exports = {
  leerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
};
