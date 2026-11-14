// Conexión a la base de datos.
// - En producción (Render) usamos PostgreSQL en Neon, con la dirección guardada en DATABASE_URL.
// - En el computador, si no hay DATABASE_URL, usamos un archivo SQLite local (viene incluido en Node 22).
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { Pool } = require("pg");
const productosIniciales = require("./productos.json");

const DATABASE_URL = process.env.DATABASE_URL;

// Neon entrega la URL con "?sslmode=require&channel_binding=require". La librería pg
// no necesita esos parámetros porque abajo activamos SSL nosotros; por eso los quitamos.
function normalizarDatabaseUrl(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error();
    for (const clave of [...url.searchParams.keys()]) {
      if (["channel_binding", "sslmode", "ssl"].includes(clave.toLowerCase())) url.searchParams.delete(clave);
    }
    return url.toString();
  } catch {
    throw new Error("DATABASE_URL debe ser una URL PostgreSQL válida.");
  }
}

// "pool" es un grupo de conexiones a PostgreSQL que se reutilizan entre peticiones.
const pool = DATABASE_URL
  ? new Pool({
      connectionString: normalizarDatabaseUrl(DATABASE_URL),
      ssl: { rejectUnauthorized: true }, // conexión cifrada y con certificado verificado
      connectionTimeoutMillis: 10000,
    })
  : null;

// En producción nunca usamos SQLite: en Render los archivos se borran en cada despliegue.
const sqlite = !DATABASE_URL && process.env.NODE_ENV !== "production"
  ? new DatabaseSync(process.env.SQLITE_PATH ? path.resolve(process.env.SQLITE_PATH) : path.join(__dirname, "michemango.sqlite"))
  : null;

if (pool) {
  pool.on("error", (error) => {
    console.error("Se perdió una conexión inactiva con PostgreSQL.", error.code || "DATABASE_CONNECTION_ERROR");
  });
}

// Ejecuta una consulta SQL en la base que esté activa y devuelve { rows, rowCount }.
// Escribimos el SQL una sola vez con $1, $2... (estilo PostgreSQL); para SQLite los cambiamos por ?1, ?2...
// Los valores siempre van aparte en "parametros": así evitamos inyección SQL.
async function consulta(sql, parametros = []) {
  if (pool) {
    const resultado = await pool.query(sql, parametros);
    return { rows: resultado.rows, rowCount: resultado.rowCount };
  }

  const sentencia = sqlite.prepare(sql.replace(/\$(\d+)/g, "?$1"));
  if (/^\s*SELECT|RETURNING/i.test(sql)) {
    const rows = sentencia.all(...parametros);
    return { rows, rowCount: rows.length };
  }
  const resultado = sentencia.run(...parametros);
  return { rows: [], rowCount: resultado.changes };
}

// Tablas del proyecto. Se crean solo si no existen, así que es seguro ejecutarlo en cada arranque.
const TABLAS = `
  CREATE TABLE IF NOT EXISTS michemango_products (
    id TEXT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    categoria VARCHAR(40) NOT NULL,
    precio INTEGER NOT NULL CHECK (precio > 0),
    descripcion VARCHAR(220) NOT NULL,
    imagen VARCHAR(20) NOT NULL DEFAULT 'micheman'
  );
  CREATE TABLE IF NOT EXISTS michemango_requests (
    id TEXT PRIMARY KEY,
    fecha TIMESTAMPTZ NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    correo VARCHAR(120),
    telefono VARCHAR(25),
    tipo VARCHAR(32) NOT NULL,
    producto_interes VARCHAR(80),
    mensaje VARCHAR(1000) NOT NULL,
    estado VARCHAR(16) NOT NULL CHECK (estado IN ('nueva', 'confirmada', 'atendida'))
  );
`;

// Los cuatro productos iniciales tenían un emoji como imagen; ahora usan una ilustración.
// Solo cambiamos los que todavía tienen el emoji original (si el admin lo editó, se respeta).
const IMAGENES_NUEVAS = [
  ["1", "🥭", "micheman"],
  ["2", "✨", "premium"],
  ["3", "🌶️", "explosivo"],
  ["4", "🍋", "mini"],
];

// Se ejecuta al arrancar el servidor (y con "npm run db:init").
async function inicializarAlmacenamiento() {
  if (!pool && !sqlite) {
    throw new Error("DATABASE_URL es obligatorio en producción.");
  }

  if (pool) await pool.query(TABLAS);
  else sqlite.exec(TABLAS);

  // Si la tabla de productos está vacía (base nueva), cargamos el catálogo inicial.
  const { rows } = await consulta("SELECT COUNT(*) AS total FROM michemango_products");
  if (Number(rows[0].total) === 0) {
    for (const producto of productosIniciales) {
      await consulta(
        `INSERT INTO michemango_products (id, nombre, categoria, precio, descripcion, imagen)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [String(producto.id), producto.nombre, producto.categoria, producto.precio, producto.descripcion, producto.imagen],
      );
    }
  }

  for (const [id, emoji, clave] of IMAGENES_NUEVAS) {
    await consulta("UPDATE michemango_products SET imagen = $1 WHERE id = $2 AND imagen = $3", [clave, id, emoji]);
  }
}

async function cerrarAlmacenamiento() {
  if (pool) await pool.end();
  if (sqlite) sqlite.close();
}

function modoAlmacenamiento() {
  if (pool) return "postgresql";
  if (sqlite) return "sqlite-local";
  return "unavailable";
}

module.exports = {
  pool,
  sqlite,
  consulta,
  normalizarDatabaseUrl,
  inicializarAlmacenamiento,
  cerrarAlmacenamiento,
  modoAlmacenamiento,
};
