const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-only-secret-for-logout";

const { pool } = require("../src/config/database");
const app = require("../src/app");

// HU-020 / RF-005: cerrar sesión revoca el token en el servidor
async function iniciar(t) {
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

test("cerrar sesión sube la versión de sesión y el mismo token deja de servir", async (t) => {
  let version = 0;
  const original = pool.query;
  pool.query = async (sql) => {
    if (sql.startsWith("SELECT activo, rol, sesion_version")) return [[{ activo: 1, rol: "vendedor", sesion_version: version }], []];
    if (sql.startsWith("UPDATE usuarios SET sesion_version = sesion_version + 1")) { version += 1; return [{ affectedRows: 1 }, []]; }
    if (sql.startsWith("SELECT v.id")) return [[], []];
    return [[], []];
  };
  t.after(() => { pool.query = original; });
  const base = await iniciar(t);
  const token = jwt.sign({ id: 5, usuario: "vendedor", rol: "vendedor", sv: 0 }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const cabecera = { Authorization: `Bearer ${token}` };

  assert.equal((await fetch(`${base}/api/auth/logout`, { method: "POST", headers: cabecera })).status, 200);
  assert.equal(version, 1);
  // El token anterior ya no sirve, ni siquiera para cerrar sesión otra vez
  assert.equal((await fetch(`${base}/api/ventas`, { headers: cabecera })).status, 401);
  assert.equal((await fetch(`${base}/api/auth/logout`, { method: "POST", headers: cabecera })).status, 401);
});

test("un token emitido antes del cambio (sin versión) sigue valiendo mientras la versión sea 0", async (t) => {
  const original = pool.query;
  pool.query = async (sql) => (sql.startsWith("SELECT activo, rol, sesion_version") ? [[{ activo: 1, rol: "vendedor", sesion_version: 0 }], []] : [[], []]);
  t.after(() => { pool.query = original; });
  const base = await iniciar(t);
  const antiguo = jwt.sign({ id: 5, usuario: "vendedor", rol: "vendedor" }, process.env.JWT_SECRET, { expiresIn: "1h" });
  assert.equal((await fetch(`${base}/api/ventas`, { headers: { Authorization: `Bearer ${antiguo}` } })).status, 200);
});

test("cerrar sesión sin token responde 401", async (t) => {
  const base = await iniciar(t);
  assert.equal((await fetch(`${base}/api/auth/logout`, { method: "POST" })).status, 401);
});
