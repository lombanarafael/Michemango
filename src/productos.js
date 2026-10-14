const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { pool } = require("./data/storage");

const CARPETA_DATOS = path.join(__dirname, "data");
const ARCHIVO_PRODUCTOS = path.join(CARPETA_DATOS, "productos.json");

const productosIniciales = [
  {
    id: 1,
    nombre: "Micheman",
    categoria: "Clásicos",
    precio: 15000,
    descripcion: "Mango fresco, limón y chamoy: una combinación intensa y refrescante.",
    imagen: "🥭",
  },
  {
    id: 2,
    nombre: "Miche Premium",
    categoria: "Premium",
    precio: 18000,
    descripcion: "Mango con gomitas, tajín y frutas para una experiencia más completa.",
    imagen: "✨",
  },
  {
    id: 3,
    nombre: "Mango Explosivo",
    categoria: "Picante",
    precio: 20000,
    descripcion: "Mango, maracuyá, chamoy y tajín en una mezcla tropical, ácida y picante.",
    imagen: "🌶️",
  },
  {
    id: 4,
    nombre: "Mini Miche",
    categoria: "Pequeños",
    precio: 10000,
    descripcion: "Porción pequeña de mango, limón y chamoy para un antojo lleno de sabor.",
    imagen: "🍋",
  },
];

function crearArchivoProductosSiHaceFalta() {
  fs.mkdirSync(CARPETA_DATOS, { recursive: true });

  if (!fs.existsSync(ARCHIVO_PRODUCTOS)) {
    fs.writeFileSync(ARCHIVO_PRODUCTOS, JSON.stringify(productosIniciales, null, 2), "utf8");
  }
}

async function leerProductos() {
  if (pool) {
    const resultado = await pool.query(
      `SELECT id, nombre, categoria, precio, descripcion, imagen
       FROM michemango_products
       ORDER BY nombre`
    );
    return resultado.rows.map((producto) => ({ ...producto, precio: Number(producto.precio) }));
  }

  try {
    crearArchivoProductosSiHaceFalta();
    const contenido = fs.readFileSync(ARCHIVO_PRODUCTOS, "utf8");
    const productos = JSON.parse(contenido);

    if (!Array.isArray(productos)) {
      throw new Error("El archivo de productos debe contener un arreglo JSON.");
    }

    return productos;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return productosIniciales;
    }

    throw error;
  }
}

function escribirProductos(productos) {
  fs.mkdirSync(CARPETA_DATOS, { recursive: true });
  const archivoTemporal = `${ARCHIVO_PRODUCTOS}.${process.pid}.tmp`;
  fs.writeFileSync(archivoTemporal, JSON.stringify(productos, null, 2), "utf8");
  fs.renameSync(archivoTemporal, ARCHIVO_PRODUCTOS);
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

  const productos = await leerProductos();
  productos.push(nuevoProducto);
  escribirProductos(productos);
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

  productos[indice] = productoActualizado;
  escribirProductos(productos);
  return productoActualizado;
}

async function eliminarProducto(id) {
  if (pool) {
    const resultado = await pool.query("DELETE FROM michemango_products WHERE id = $1", [String(id)]);
    return resultado.rowCount > 0;
  }

  const productos = await leerProductos();
  const indice = productos.findIndex((elemento) => String(elemento.id) === String(id));

  if (indice === -1) {
    return false;
  }

  productos.splice(indice, 1);
  escribirProductos(productos);
  return true;
}

module.exports = {
  productosIniciales,
  leerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
};
