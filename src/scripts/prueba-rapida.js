// Prueba rápida del backend ("npm run test:smoke").
// Arranca el servidor con una base SQLite temporal y comprueba salud, CORS, formulario,
// login, panel protegido y que los datos se conservan al reiniciar. Al final borra todo.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const bcrypt = require("bcryptjs");

const projectRoot = path.join(__dirname, "..", "..");
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "michemango-prueba-"));
const databaseFile = path.join(temporaryDirectory, "local.sqlite");
const adminPassword = crypto.randomBytes(32).toString("base64url");
const adminUser = `prueba-${crypto.randomUUID()}`;

process.env.NODE_ENV = "development";
process.env.ADMIN_USER = adminUser;
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync(adminPassword, 8);
process.env.JWT_SECRET = crypto.randomBytes(48).toString("base64url");
process.env.FRONTEND_ORIGIN = "https://michemango.netlify.app";
process.env.GITHUB_PAGES_ORIGIN = "https://lombanarafael.github.io";
process.env.CORS_ORIGINS = [
  process.env.FRONTEND_ORIGIN,
  process.env.GITHUB_PAGES_ORIGIN,
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].join(",");
process.env.SQLITE_PATH = databaseFile;
process.env.DATABASE_URL = "";

let server;
let baseDatos;

function clearProjectModules() {
  for (const file of Object.keys(require.cache)) {
    if (file.startsWith(projectRoot + path.sep + "src" + path.sep)) {
      delete require.cache[file];
    }
  }
}

async function startApp(initialize = true) {
  baseDatos = require("../data/baseDatos");
  if (initialize) await baseDatos.inicializarAlmacenamiento();

  const app = require("../server");
  server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    instance.once("error", reject);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

async function closeApp() {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    server = null;
  }
  if (baseDatos) {
    await baseDatos.cerrarAlmacenamiento();
    baseDatos = null;
  }
}

async function iniciarSesion(baseUrl) {
  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario: adminUser, contrasena: adminPassword }),
  });
  assert.equal(response.status, 200, "el login del admin funciona");
  assert.deepEqual(response.headers.getSetCookie(), [], "el login no usa cookies");
  return (await response.json()).token;
}

async function main() {
  let baseUrl = await startApp();
  let response = await fetch(`${baseUrl}/api/health`);
  let body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(
    [body.status, body.storage, body.database],
    ["ok", "sqlite-local", "connected"]
  );
  console.log("OK  salud del servidor y creación automática de tablas en SQLite");

  response = await fetch(`${baseUrl}/api/health`, {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:5500",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization",
    },
  });
  assert.equal(response.status, 204, "localhost puede llamar a la API");
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5500");
  assert.match(response.headers.get("access-control-allow-headers"), /Authorization/i);
  response = await fetch(`${baseUrl}/api/health`, {
    method: "OPTIONS",
    headers: {
      Origin: process.env.GITHUB_PAGES_ORIGIN,
      "Access-Control-Request-Method": "POST",
    },
  });
  assert.equal(response.status, 204, "GitHub Pages puede llamar a la API");
  assert.equal(response.headers.get("access-control-allow-origin"), process.env.GITHUB_PAGES_ORIGIN);
  response = await fetch(`${baseUrl}/api/health`, { headers: { Origin: "https://sitio-ajeno.example" } });
  assert.equal(response.status, 403, "un sitio desconocido es rechazado");
  console.log("OK  CORS permite Netlify, GitHub Pages y localhost, y bloquea otros sitios");

  const idempotencyKey = crypto.randomUUID();
  const requestBody = {
    nombre: "Prueba local",
    correo: "prueba@example.test",
    telefono: "",
    mensaje: "Verificar persistencia después de reiniciar.",
  };
  const enviarSolicitud = () => fetch(`${baseUrl}/api/contacto`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(requestBody),
  });
  const creada = await enviarSolicitud();
  const cuerpoCreado = await creada.json();
  assert.equal(creada.status, 201);
  const duplicada = await enviarSolicitud();
  assert.equal(duplicada.status, 201);
  assert.equal((await duplicada.json()).solicitud.id, cuerpoCreado.solicitud.id);
  console.log("OK  formulario de contacto y reintento sin duplicar (Idempotency-Key)");

  response = await fetch(`${baseUrl}/api/admin/solicitudes`);
  assert.equal(response.status, 401, "el panel rechaza peticiones sin token");
  let token = await iniciarSesion(baseUrl);
  const autorizacion = { Authorization: `Bearer ${token}` };
  response = await fetch(`${baseUrl}/api/admin/session`, { headers: autorizacion });
  assert.equal(response.status, 200);
  response = await fetch(`${baseUrl}/api/admin/solicitudes`, { headers: autorizacion });
  let solicitudes = await response.json();
  assert.equal(response.status, 200);
  assert.equal(solicitudes.length, 1, "el reintento no duplica la solicitud");
  assert.equal(solicitudes[0].nombre, "Prueba local");
  assert.equal(solicitudes[0].productoInteres, null);
  response = await fetch(`${baseUrl}/api/admin/solicitudes/${cuerpoCreado.solicitud.id}/estado`, {
    method: "PATCH",
    headers: { ...autorizacion, "Content-Type": "application/json" },
    body: JSON.stringify({ estado: "confirmada" }),
  });
  assert.equal(response.status, 200);
  console.log("OK  login del admin, panel protegido, lista de solicitudes y cambio de estado");

  await closeApp();
  clearProjectModules();
  baseUrl = await startApp();
  response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  token = await iniciarSesion(baseUrl);
  response = await fetch(`${baseUrl}/api/admin/solicitudes?estado=confirmada`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  solicitudes = await response.json();
  assert.equal(response.status, 200);
  assert.equal(solicitudes.length, 1);
  assert.equal(solicitudes[0].id, cuerpoCreado.solicitud.id);
  console.log("OK  la solicitud sigue guardada después de reiniciar el servidor");

  response = await fetch(`${baseUrl}/api/admin/solicitudes`, {
    headers: { Authorization: "Bearer token-falso" },
  });
  assert.equal(response.status, 401, "el panel rechaza tokens falsos");
  console.log("OK  un token JWT falso no entra al panel");

  // Recomendador: misma regla que la página, ahora desde la API.
  response = await fetch(`${baseUrl}/api/recomendaciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sabor: "picante", tamano: "grande", ocasion: "compartir" }),
  });
  body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.producto.nombre, "Mango Explosivo");
  assert.match(body.motivo, /picante/);
  response = await fetch(`${baseUrl}/api/recomendaciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sabor: "dulce", tamano: "pequeno", ocasion: "antojo" }),
  });
  assert.equal((await response.json()).producto.nombre, "Mini Miche", "la ocasión y el tamaño cambian el resultado");
  response = await fetch(`${baseUrl}/api/recomendaciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sabor: "dulce", tamano: "pequeno", ocasión: "antojo" }),
  });
  assert.equal(response.status, 400, "el campo debe llamarse ocasion, sin tilde");
  console.log("OK  recomendador por reglas con explicación");

  // Productos: crear, editar y eliminar desde el panel.
  const conToken = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  response = await fetch(`${baseUrl}/api/admin/productos`, {
    method: "POST",
    headers: conToken,
    body: JSON.stringify({ nombre: "Miche Prueba", categoria: "Clásicos", precio: 15000, descripcion: "Prueba", imagen: "mini" }),
  });
  assert.equal(response.status, 201, "se puede crear un producto con precio 15000");
  const creado = (await response.json()).producto;
  response = await fetch(`${baseUrl}/api/admin/productos/${creado.id}`, {
    method: "PATCH",
    headers: conToken,
    body: JSON.stringify({ precio: 16000 }),
  });
  assert.equal((await response.json()).producto.precio, 16000);
  response = await fetch(`${baseUrl}/api/admin/productos`, {
    method: "POST",
    headers: conToken,
    body: JSON.stringify({ nombre: "", precio: -1 }),
  });
  assert.equal(response.status, 400, "un producto inválido se rechaza");
  response = await fetch(`${baseUrl}/api/admin/productos/${creado.id}`, { method: "DELETE", headers: conToken });
  assert.equal(response.status, 200);
  response = await fetch(`${baseUrl}/api/productos`);
  const catalogo = await response.json();
  assert.equal(catalogo.length, 4);
  assert.deepEqual(catalogo.map((producto) => producto.imagen).sort(), ["explosivo", "micheman", "mini", "premium"]);
  console.log("OK  crear, editar y eliminar productos; catálogo con fotos");

  // Una base antigua con emojis pasa a las fotos al arrancar.
  await baseDatos.consulta("UPDATE michemango_products SET imagen = $1 WHERE id = $2", ["🥭", "1"]);
  await baseDatos.consulta("UPDATE michemango_products SET imagen = $1 WHERE id = $2", ["🍓", "4"]);
  await baseDatos.inicializarAlmacenamiento();
  const { rows } = await baseDatos.consulta("SELECT id, imagen FROM michemango_products WHERE id IN ('1', '4') ORDER BY id");
  assert.deepEqual(rows.map((fila) => fila.imagen), ["micheman", "🍓"], "solo cambia el emoji original");
  console.log("OK  los emojis antiguos cambian por fotos sin pisar cambios del admin");

  const neonUrl = "postgresql://ep-example.neon.tech/database?sslmode=require&channel_binding=require";
  const normalizedUrl = baseDatos.normalizarDatabaseUrl(neonUrl);
  assert.equal(normalizedUrl.includes("channel_binding"), false);
  assert.equal(normalizedUrl.includes("sslmode"), false);
  await closeApp();
  clearProjectModules();

  process.env.DATABASE_URL = "postgresql://127.0.0.1:1/test?sslmode=require&channel_binding=require";
  baseDatos = require("../data/baseDatos");
  assert.equal(baseDatos.pool.options.ssl.rejectUnauthorized, true);
  assert.equal(baseDatos.pool.options.connectionString.includes("channel_binding"), false);
  assert.equal(baseDatos.pool.options.connectionString.includes("sslmode"), false);
  const app = require("../server");
  server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    instance.once("error", reject);
  });
  response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
  body = await response.json();
  assert.equal(response.status, 503);
  assert.deepEqual([body.status, body.database], ["unavailable", "unavailable"]);
  assert.equal(JSON.stringify(body).includes("postgresql://"), false);
  console.log("OK  URL de Neon, conexión cifrada y error de salud sin datos sensibles");
}

main()
  .catch((error) => {
    console.error("La prueba rápida falló:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await closeApp();
    } catch (error) {
      console.error("No se pudo cerrar el servidor de prueba:", error.code || error.name);
      process.exitCode = 1;
    }
    try {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    } catch (error) {
      console.error("No se pudo borrar la base temporal:", error.code || error.name);
      process.exitCode = 1;
    }
  });
