
const fs = require("fs");
const path = require("path");

const raizProyecto = path.join(__dirname, "..", "..");
const archivoCatalogo = path.join(raizProyecto, "src", "data", "productos.json");
const archivoSalida = path.join(raizProyecto, "frontend", "src", "data", "catalogo-respaldo.json");
const productos = JSON.parse(fs.readFileSync(archivoCatalogo, "utf8"));

if (
  !Array.isArray(productos) ||
  productos.length === 0 ||
  productos.some((producto) =>
    !producto ||
    (typeof producto.id !== "string" && !Number.isInteger(producto.id)) ||
    typeof producto.nombre !== "string" ||
    !Number.isSafeInteger(producto.precio) ||
    producto.precio < 1 ||
    typeof producto.descripcion !== "string"
  )
) {
  throw new Error("El catálogo de src/data/productos.json contiene productos no válidos.");
}

const contenido = `${JSON.stringify(productos, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (!fs.existsSync(archivoSalida) || fs.readFileSync(archivoSalida, "utf8") !== contenido) {
    throw new Error("El catálogo de respaldo no está sincronizado. Ejecuta npm run catalogo:sync.");
  }
  console.log(`Catálogo de respaldo sincronizado (${productos.length} productos).`);
} else {
  fs.mkdirSync(path.dirname(archivoSalida), { recursive: true });
  fs.writeFileSync(archivoSalida, contenido, "utf8");
  console.log(`Catálogo de respaldo generado con ${productos.length} productos.`);
}
