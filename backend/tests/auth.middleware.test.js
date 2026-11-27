const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-only-secret-for-auth-middleware";

const { pool } = require("../src/config/database");
const { verificarToken } = require("../src/middlewares/auth.middleware");

function simularUsuario(t, usuario) {
  const originalQuery = pool.query;
  pool.query = async () => [usuario ? [usuario] : [], []];
  t.after(() => {
    pool.query = originalQuery;
  });
}

async function verificar(token) {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const res = {
    statusCode: 200,
    body: null,
    status(codigo) { this.statusCode = codigo; return this; },
    json(cuerpo) { this.body = cuerpo; return this; },
  };
  let siguio = false;
  await verificarToken(req, res, () => { siguio = true; });
  return { req, res, siguio };
}

const tokenOperario = () => jwt.sign({ id: 11, usuario: "operario", rol: "operario" }, process.env.JWT_SECRET);

test("deja pasar a un usuario activo con el mismo rol del token", async (t) => {
  simularUsuario(t, { activo: 1, rol: "operario" });
  const { req, siguio } = await verificar(tokenOperario());
  assert.equal(siguio, true);
  assert.equal(req.usuario.rol, "operario");
});

test("rechaza con 401 el token de un usuario desactivado", async (t) => {
  simularUsuario(t, { activo: 0, rol: "operario" });
  const { res, siguio } = await verificar(tokenOperario());
  assert.equal(siguio, false);
  assert.equal(res.statusCode, 401);
  assert.match(res.body.mensaje, /ya no es válida/);
});

test("rechaza con 401 el token de un usuario al que le cambiaron el rol", async (t) => {
  simularUsuario(t, { activo: 1, rol: "vendedor" });
  const { res, siguio } = await verificar(tokenOperario());
  assert.equal(siguio, false);
  assert.equal(res.statusCode, 401);
});

test("rechaza con 401 el token de un usuario que ya no existe", async (t) => {
  simularUsuario(t, null);
  const { res } = await verificar(tokenOperario());
  assert.equal(res.statusCode, 401);
});

test("un token vencido responde 401 para que el panel lleve al login", async (t) => {
  simularUsuario(t, { activo: 1, rol: "operario" });
  const vencido = jwt.sign({ id: 11, rol: "operario", exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET);
  const { res, siguio } = await verificar(vencido);
  assert.equal(siguio, false);
  assert.equal(res.statusCode, 401);
});

test("sin token responde 401", async () => {
  const { res } = await verificar(null);
  assert.equal(res.statusCode, 401);
});
