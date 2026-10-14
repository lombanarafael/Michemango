const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_SSL = process.env.DATABASE_SSL;

if (DATABASE_SSL !== undefined && !["true", "false"].includes(DATABASE_SSL)) {
  throw new Error("DATABASE_SSL debe ser true o false.");
}

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
      connectionTimeoutMillis: 10000,
    })
  : null;
const SQLITE_FILE = path.join(__dirname, "michemango.sqlite");
const sqlite = !DATABASE_URL && process.env.NODE_ENV !== "production"
  ? new DatabaseSync(SQLITE_FILE)
  : null;
const PRODUCTOS_JSON = path.join(__dirname, "productos.json");
const SOLICITUDES_JSON = path.join(__dirname, "solicitudes.json");

if (pool) {
  pool.on("error", (error) => {
    console.error("Se perdió una conexión inactiva con PostgreSQL.", error.code || "DATABASE_CONNECTION_ERROR");
  });
}

function leerJson(archivo, predeterminado) {
  try {
    const contenido = fs.readFileSync(archivo, "utf8");
    const valor = JSON.parse(contenido);

    if (!Array.isArray(valor)) {
      throw new Error(`${path.basename(archivo)} debe contener una lista JSON.`);
    }

    return valor;
  } catch (error) {
    if (error.code === "ENOENT") {
      return predeterminado;
    }
    throw error;
  }
}

async function importarJsonPostgres(client, productos, solicitudes) {
  const migracion = await client.query(
    "SELECT 1 FROM michemango_migrations WHERE migration_name = $1",
    ["json-files-v1"]
  );
  if (migracion.rowCount > 0) return;

  const productosExistentes = await client.query("SELECT COUNT(*)::int AS total FROM michemango_products");
  if (productosExistentes.rows[0].total === 0) {
    for (const producto of productos) {
      await client.query(
        `INSERT INTO michemango_products (id, nombre, categoria, precio, descripcion, imagen)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [
          String(producto.id),
          producto.nombre,
          producto.categoria || "General",
          producto.precio,
          producto.descripcion,
          producto.imagen || "🥭",
        ]
      );
    }
  }

  const solicitudesExistentes = await client.query("SELECT COUNT(*)::int AS total FROM michemango_requests");
  if (solicitudesExistentes.rows[0].total === 0) {
    for (const solicitud of solicitudes) {
      await client.query(
        `INSERT INTO michemango_requests
          (id, fecha, nombre, correo, telefono, tipo, producto_interes, mensaje, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          String(solicitud.id),
          solicitud.fecha,
          solicitud.nombre,
          solicitud.correo || null,
          solicitud.telefono || null,
          solicitud.tipo,
          solicitud.productoInteres || null,
          solicitud.mensaje,
          ["nueva", "confirmada", "atendida"].includes(solicitud.estado) ? solicitud.estado : "nueva",
        ]
      );
    }
  }

  await client.query(
    "INSERT INTO michemango_migrations (migration_name) VALUES ($1) ON CONFLICT DO NOTHING",
    ["json-files-v1"]
  );
}

function importarJsonSqlite(productos, solicitudes) {
  const migracion = sqlite.prepare(
    "SELECT 1 FROM michemango_migrations WHERE migration_name = ?"
  ).get("json-files-v1");
  if (migracion) return;

  const totalProductos = sqlite.prepare("SELECT COUNT(*) AS total FROM michemango_products").get().total;
  if (totalProductos === 0) {
    const insertarProducto = sqlite.prepare(
      `INSERT INTO michemango_products (id, nombre, categoria, precio, descripcion, imagen)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const producto of productos) {
      insertarProducto.run(
        String(producto.id),
        producto.nombre,
        producto.categoria || "General",
        producto.precio,
        producto.descripcion,
        producto.imagen || "🥭"
      );
    }
  }

  const totalSolicitudes = sqlite.prepare("SELECT COUNT(*) AS total FROM michemango_requests").get().total;
  if (totalSolicitudes === 0) {
    const insertarSolicitud = sqlite.prepare(
      `INSERT INTO michemango_requests
        (id, fecha, nombre, correo, telefono, tipo, producto_interes, mensaje, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const solicitud of solicitudes) {
      insertarSolicitud.run(
        String(solicitud.id),
        solicitud.fecha,
        solicitud.nombre,
        solicitud.correo || null,
        solicitud.telefono || null,
        solicitud.tipo,
        solicitud.productoInteres || null,
        solicitud.mensaje,
        ["nueva", "confirmada", "atendida"].includes(solicitud.estado) ? solicitud.estado : "nueva"
      );
    }
  }

  sqlite.prepare(
    "INSERT INTO michemango_migrations (migration_name) VALUES (?) ON CONFLICT DO NOTHING"
  ).run("json-files-v1");
}

async function inicializarAlmacenamiento() {
  if (!pool && !sqlite) {
    throw new Error("DATABASE_URL es obligatorio en producción para usar almacenamiento persistente.");
  }

  const productos = leerJson(PRODUCTOS_JSON, []);
  const solicitudes = leerJson(SOLICITUDES_JSON, []);

  if (sqlite) {
    sqlite.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS michemango_products (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        categoria TEXT NOT NULL,
        precio INTEGER NOT NULL CHECK (precio > 0),
        descripcion TEXT NOT NULL,
        imagen TEXT NOT NULL DEFAULT '🥭'
      );
      CREATE TABLE IF NOT EXISTS michemango_requests (
        id TEXT PRIMARY KEY,
        fecha TEXT NOT NULL,
        nombre TEXT NOT NULL,
        correo TEXT,
        telefono TEXT,
        tipo TEXT NOT NULL,
        producto_interes TEXT,
        mensaje TEXT NOT NULL,
        estado TEXT NOT NULL CHECK (estado IN ('nueva', 'confirmada', 'atendida'))
      );
      CREATE INDEX IF NOT EXISTS michemango_requests_fecha_idx
        ON michemango_requests (fecha DESC);
      CREATE TABLE IF NOT EXISTS michemango_migrations (
        migration_name TEXT PRIMARY KEY,
        completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    sqlite.exec("BEGIN");
    try {
      importarJsonSqlite(productos, solicitudes);
      sqlite.exec("COMMIT");
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS michemango_products (
      id TEXT PRIMARY KEY,
      nombre VARCHAR(80) NOT NULL,
      categoria VARCHAR(40) NOT NULL,
      precio INTEGER NOT NULL CHECK (precio > 0),
      descripcion VARCHAR(220) NOT NULL,
      imagen VARCHAR(20) NOT NULL DEFAULT '🥭'
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
    CREATE INDEX IF NOT EXISTS michemango_requests_fecha_idx
      ON michemango_requests (fecha DESC);
    CREATE TABLE IF NOT EXISTS michemango_migrations (
      migration_name TEXT PRIMARY KEY,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query("ALTER TABLE michemango_requests ADD COLUMN IF NOT EXISTS producto_interes VARCHAR(80)");
  await pool.query("ALTER TABLE michemango_requests DROP CONSTRAINT IF EXISTS michemango_requests_estado_check");
  await pool.query(`
    ALTER TABLE michemango_requests
    ADD CONSTRAINT michemango_requests_estado_check
    CHECK (estado IN ('nueva', 'confirmada', 'atendida'))
  `);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await importarJsonPostgres(client, productos, solicitudes);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
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
  inicializarAlmacenamiento,
  cerrarAlmacenamiento,
  modoAlmacenamiento,
};
