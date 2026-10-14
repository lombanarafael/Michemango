const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
      connectionTimeoutMillis: 10000,
    })
  : null;
const PRODUCTOS_JSON = path.join(__dirname, "productos.json");
const SOLICITUDES_JSON = path.join(__dirname, "solicitudes.json");

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

async function inicializarAlmacenamiento() {
  if (!pool) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL es obligatorio en producción para usar almacenamiento persistente.");
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
      mensaje VARCHAR(1000) NOT NULL,
      estado VARCHAR(16) NOT NULL CHECK (estado IN ('nueva', 'atendida'))
    );
    CREATE INDEX IF NOT EXISTS michemango_requests_fecha_idx
      ON michemango_requests (fecha DESC);
    CREATE TABLE IF NOT EXISTS michemango_migrations (
      migration_name TEXT PRIMARY KEY,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const productos = leerJson(PRODUCTOS_JSON, []);
  const solicitudes = leerJson(SOLICITUDES_JSON, []);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const migracion = await client.query(
      "SELECT 1 FROM michemango_migrations WHERE migration_name = $1",
      ["json-files-v1"]
    );

    if (migracion.rowCount === 0) {
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
              (id, fecha, nombre, correo, telefono, tipo, mensaje, estado)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING`,
            [
              String(solicitud.id),
              solicitud.fecha,
              solicitud.nombre,
              solicitud.correo || null,
              solicitud.telefono || null,
              solicitud.tipo,
              solicitud.mensaje,
              solicitud.estado === "atendida" ? "atendida" : "nueva",
            ]
          );
        }
      }

      await client.query(
        "INSERT INTO michemango_migrations (migration_name) VALUES ($1) ON CONFLICT DO NOTHING",
        ["json-files-v1"]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function modoAlmacenamiento() {
  return pool ? "postgresql" : "json-local";
}

module.exports = {
  pool,
  inicializarAlmacenamiento,
  modoAlmacenamiento,
};
