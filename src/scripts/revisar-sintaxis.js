// Revisa que todos los archivos .js del backend no tengan errores de sintaxis (node --check).
// Lo usa "npm run check" antes de compilar el frontend.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const carpetaSrc = path.join(__dirname, "..");
const archivos = fs.readdirSync(carpetaSrc, { recursive: true })
  .filter((archivo) => archivo.endsWith(".js"))
  .map((archivo) => path.join(carpetaSrc, archivo));

for (const archivo of archivos) {
  execFileSync(process.execPath, ["--check", archivo], { stdio: "inherit" });
}
console.log(`Sintaxis correcta en ${archivos.length} archivos del backend.`);
