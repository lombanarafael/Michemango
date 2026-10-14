const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

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

function leerProductos() {
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

function crearProducto(producto) {
  const productos = leerProductos();
  const nuevoProducto = {
    id: randomUUID(),
    ...normalizarProducto(producto),
  };

  productos.push(nuevoProducto);
  escribirProductos(productos);
  return nuevoProducto;
}

function actualizarProducto(id, producto) {
  const productos = leerProductos();
  const indice = productos.findIndex((elemento) => String(elemento.id) === String(id));

  if (indice === -1) {
    return null;
  }

  const productoActualizado = {
    id: productos[indice].id,
    ...normalizarProducto(producto, productos[indice]),
  };

  productos[indice] = productoActualizado;
  escribirProductos(productos);
  return productoActualizado;
}

function eliminarProducto(id) {
  const productos = leerProductos();
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
