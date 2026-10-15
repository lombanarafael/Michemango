const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const bcrypt = require("bcryptjs");

const projectRoot = path.join(__dirname, "..", "..");
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "michemango-smoke-"));
const databaseFile = path.join(temporaryDirectory, "local.sqlite");
const adminPassword = crypto.randomBytes(32).toString("base64url");
const adminUser = `smoke-${crypto.randomUUID()}`;

process.env.NODE_ENV = "development";
process.env.ADMIN_USER = adminUser;
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync(adminPassword, 8);
process.env.SESSION_SECRET = crypto.randomBytes(48).toString("base64url");
process.env.SQLITE_PATH = databaseFile;
process.env.DATABASE_URL = "";

let server;
let storage;

function clearProjectModules() {
  for (const file of Object.keys(require.cache)) {
    if (file.startsWith(projectRoot + path.sep + "src" + path.sep)) {
      delete require.cache[file];
    }
  }
}

async function startApp(initialize = true) {
  storage = require("../data/storage");
  if (initialize) await storage.inicializarAlmacenamiento();

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
  if (storage) {
    await storage.cerrarAlmacenamiento();
    storage = null;
  }
}

async function iniciarSesion(baseUrl) {
  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario: adminUser, contrasena: adminPassword }),
  });
  assert.equal(response.status, 200, "admin login succeeds");
  const cookies = response.headers.getSetCookie();
  assert.ok(cookies.length, "login sets a session cookie");
  return cookies[0].split(";", 1)[0];
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
  console.log("PASS health check and automatic SQLite schema migration");

  const idempotencyKey = crypto.randomUUID();
  const requestBody = {
    nombre: "Prueba local",
    correo: "smoke@example.test",
    telefono: "",
    tipo: "duda",
    productoInteres: "Micheman",
    mensaje: "Verificar persistencia después de reiniciar.",
  };
  const enviarSolicitud = () => fetch(`${baseUrl}/api/solicitudes`, {
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
  console.log("PASS contact submission and idempotent retry");

  response = await fetch(`${baseUrl}/api/admin/solicitudes`);
  assert.equal(response.status, 401, "admin routes reject unauthenticated requests");
  let cookie = await iniciarSesion(baseUrl);
  response = await fetch(`${baseUrl}/api/admin/session`, { headers: { Cookie: cookie } });
  assert.equal(response.status, 200);
  response = await fetch(`${baseUrl}/api/admin/solicitudes`, { headers: { Cookie: cookie } });
  let solicitudes = await response.json();
  assert.equal(response.status, 200);
  assert.equal(solicitudes.length, 1, "idempotent retry does not duplicate a request");
  response = await fetch(`${baseUrl}/api/admin/solicitudes/${cuerpoCreado.solicitud.id}/estado`, {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ estado: "confirmada" }),
  });
  assert.equal(response.status, 200);
  console.log("PASS admin login, protected panel, request listing and confirmation");

  await closeApp();
  clearProjectModules();
  baseUrl = await startApp();
  response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  cookie = await iniciarSesion(baseUrl);
  response = await fetch(`${baseUrl}/api/admin/solicitudes?estado=confirmada`, {
    headers: { Cookie: cookie },
  });
  solicitudes = await response.json();
  assert.equal(response.status, 200);
  assert.equal(solicitudes.length, 1);
  assert.equal(solicitudes[0].id, cuerpoCreado.solicitud.id);
  console.log("PASS confirmed request persists after server and SQLite restart");

  const neonUrl = "postgresql://ep-example.neon.tech/database?sslmode=require&channel_binding=require";
  const normalizedUrl = storage.normalizarDatabaseUrl(neonUrl);
  assert.equal(normalizedUrl.includes("channel_binding"), false);
  assert.equal(normalizedUrl.includes("sslmode"), false);
  await closeApp();
  clearProjectModules();

  process.env.DATABASE_URL = "postgresql://127.0.0.1:1/test?sslmode=require&channel_binding=require";
  storage = require("../data/storage");
  assert.equal(storage.pool.options.ssl.rejectUnauthorized, true);
  assert.equal(storage.pool.options.connectionString.includes("channel_binding"), false);
  assert.equal(storage.pool.options.connectionString.includes("sslmode"), false);
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
  console.log("PASS Neon URI normalization, verified TLS configuration and sanitized failed health response");
}

main()
  .catch((error) => {
    console.error("Smoke test failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await closeApp();
    } catch (error) {
      console.error("Smoke test cleanup failed:", error.code || error.name);
      process.exitCode = 1;
    }
    try {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    } catch (error) {
      console.error("Temporary smoke-test database cleanup failed:", error.code || error.name);
      process.exitCode = 1;
    }
  });
