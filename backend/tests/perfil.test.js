const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-only-secret-for-perfil";

const { pool } = require("../src/config/database");
const app = require("../src/app");

// CP-115 · CR-028: «Mi perfil» de cualquier rol, con base de datos simulada
async function preparar(t) {
  const cuenta = {
    id: 9, nombre: "Ana Pérez", usuario: "ana", correo: "ana@example.test", rol: "operario",
    sesion_version: 0, password_hash: await bcrypt.hash("Clave-actual-1", 4), intentos_fallidos: 0, bloqueado: 0,
  };
  const consultas = [];
  const original = pool.query;
  pool.query = async (sql, params = []) => {
    consultas.push({ sql, params });
    if (sql.startsWith("SELECT activo, rol, sesion_version")) return [[{ activo: 1, rol: cuenta.rol, sesion_version: cuenta.sesion_version }], []];
    if (sql.startsWith("SELECT id, nombre, usuario, correo, rol, sesion_version")) return [[{ ...cuenta }], []];
    if (sql.startsWith("UPDATE usuarios SET nombre = ?")) {
      if (params[1] === "ocupado") throw Object.assign(new Error("Duplicate entry 'ocupado' for key 'usuario'"), { code: "ER_DUP_ENTRY" });
      [cuenta.nombre, cuenta.usuario, cuenta.correo] = params;
      return [{ affectedRows: 1 }, []];
    }
    if (sql.startsWith("UPDATE usuarios SET password_hash")) {
      cuenta.password_hash = params[0];
      cuenta.sesion_version += 1;
      return [{ affectedRows: 1 }, []];
    }
    if (sql.includes("intentos_fallidos = CASE")) { cuenta.intentos_fallidos += 1; return [{ affectedRows: 1 }, []]; }
    return [[], []];
  };
  t.after(() => { pool.query = original; });
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;
  const token = jwt.sign({ id: 9, usuario: "ana", rol: "operario", sv: 0 }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const llamar = async (metodo, ruta, cuerpo, conToken = token) => {
    const r = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: { "Content-Type": "application/json", ...(conToken ? { Authorization: `Bearer ${conToken}` } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  return { cuenta, consultas, llamar };
}

test("CP-115: consulta y actualiza el perfil propio, sin la clave ni datos de otros", async (t) => {
  const { cuenta, consultas, llamar } = await preparar(t);
  assert.equal((await llamar("GET", "/perfil", null, null)).status, 401);
  const perfil = await llamar("GET", "/perfil");
  assert.deepEqual(perfil.body, { id: 9, nombre: "Ana Pérez", usuario: "ana", correo: "ana@example.test", rol: "operario" });

  for (const [cambio, patron] of [
    [{ nombre: "  " }, /nombre completo/], [{ usuario: "con espacio" }, /usuario solo admite/],
    [{ correo: "no-es-correo" }, /correo electrónico no es válido/], [{ usuario: "ocupado" }, /usuario ya existe/],
  ]) {
    const r = await llamar("PUT", "/perfil", { nombre: "Ana", usuario: "ana", correo: "ana@example.test", ...cambio });
    assert.equal(r.status, cambio.usuario === "ocupado" ? 409 : 400, JSON.stringify(cambio));
    assert.match(r.body.mensaje, patron);
  }
  // El rol y el id del cuerpo se ignoran: solo cambian nombre, usuario y correo de la cuenta del token
  const r = await llamar("PUT", "/perfil", { nombre: " Ana  María Pérez ", usuario: "Ana.Maria", correo: " ANA.M@Example.test ", rol: "admin", id: 1 });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.usuario, { id: 9, nombre: "Ana María Pérez", usuario: "ana.maria", correo: "ana.m@example.test", rol: "operario" });
  assert.equal(jwt.verify(r.body.token, process.env.JWT_SECRET).usuario, "ana.maria", "el token nuevo lleva el usuario nuevo");
  assert.deepEqual(r.body.cambios, ["nombre", "usuario", "correo"]);
  assert.equal(cuenta.rol, "operario");
  // CP-116 · MEVI-117: los mismos datos (con otros espacios o mayúsculas) no se escriben de nuevo
  const escrituras = consultas.filter(({ sql }) => sql.startsWith("UPDATE usuarios SET nombre")).length;
  const igual = await llamar("PUT", "/perfil", { nombre: "Ana María  Pérez", usuario: "ANA.MARIA", correo: "Ana.M@example.test" });
  assert.equal(igual.status, 200);
  assert.deepEqual(igual.body.cambios, []);
  assert.equal(consultas.filter(({ sql }) => sql.startsWith("UPDATE usuarios SET nombre")).length, escrituras, "sin cambios no hay UPDATE");
  assert.ok(consultas.some(({ sql }) => sql.startsWith("UPDATE usuarios SET nombre = ?, usuario = ?, correo = ? WHERE id = ?")));
});

test("CP-115: cambiar la contraseña exige la actual, la nueva de 8 a 128 y revoca las demás sesiones", async (t) => {
  const { cuenta, llamar } = await preparar(t);
  for (const [cuerpo, patron] of [
    [{ nueva: "Nueva-clave-1" }, /contraseña actual/], [{ actual: "Clave-actual-1", nueva: "corta" }, /entre 8 y 128/],
    [{ actual: "Clave-actual-1", nueva: "Clave-actual-1" }, /distinta/],
  ]) {
    const r = await llamar("PUT", "/perfil/password", cuerpo);
    assert.equal(r.status, 400);
    assert.match(r.body.mensaje, patron);
  }
  const equivocada = await llamar("PUT", "/perfil/password", { actual: "otra-clave", nueva: "Nueva-clave-1" });
  assert.equal(equivocada.status, 400);
  assert.match(equivocada.body.mensaje, /no es correcta/);
  assert.equal(cuenta.intentos_fallidos, 1, "la clave equivocada cuenta como intento fallido");

  const ok = await llamar("PUT", "/perfil/password", { actual: "Clave-actual-1", nueva: "Nueva-clave-1" });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.ok(await bcrypt.compare("Nueva-clave-1", cuenta.password_hash));
  assert.equal(cuenta.sesion_version, 1);
  assert.equal(jwt.verify(ok.body.token, process.env.JWT_SECRET).sv, 1, "esta sesión sigue con un token nuevo");
  // El token anterior ya no sirve
  assert.equal((await llamar("GET", "/perfil")).status, 401);
  assert.equal((await llamar("GET", "/perfil", null, ok.body.token)).status, 200);
});
