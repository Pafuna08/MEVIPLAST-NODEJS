const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

process.env.JWT_SECRET = "test-only-secret-for-login-lockout";

const { pool } = require("../src/config/database");
const authService = require("../src/services/auth.service");
const usuariosService = require("../src/services/usuarios.service");

const hashCorrecto = bcrypt.hashSync("clave-correcta", 4);

function simularUsuario(t, cambios = {}) {
  const originalQuery = pool.query;
  const consultas = [];
  pool.query = async (sql, params = []) => {
    consultas.push({ sql, params });
    if (sql.startsWith("SELECT id, nombre, usuario, password_hash")) {
      return [[{
        id: 11,
        nombre: "Operario Demo",
        usuario: "operario",
        password_hash: hashCorrecto,
        rol: "operario",
        activo: 1,
        intentos_fallidos: 0,
        bloqueado_hasta: null,
        bloqueado: 0,
        ...cambios,
      }]];
    }
    return [{ affectedRows: 1 }];
  };
  t.after(() => {
    pool.query = originalQuery;
  });
  return consultas;
}

const actualizaciones = (consultas) => consultas.filter(({ sql }) => sql.trimStart().startsWith("UPDATE usuarios"));
const auditorias = (consultas) => consultas.filter(({ sql }) => sql.startsWith("INSERT INTO auditoria"));

test("un intento fallido por debajo del límite suma el contador y responde el mensaje genérico", async (t) => {
  const consultas = simularUsuario(t, { intentos_fallidos: 2 });

  const resultado = await authService.login("operario", "clave-erronea");

  assert.equal(resultado.ok, false);
  assert.equal(resultado.bloqueado, undefined);
  assert.match(resultado.mensaje, /incorrectos/);
  const [update] = actualizaciones(consultas);
  assert.match(update.sql, /bloqueado_hasta = CASE[\s\S]*intentos_fallidos = CASE/);
  assert.deepEqual(update.params, [5, 15, 5, 11]);
  assert.equal(auditorias(consultas).length, 0);
});

test("el quinto intento fallido bloquea la cuenta y queda en auditoría", async (t) => {
  const consultas = simularUsuario(t, { intentos_fallidos: 4 });

  const resultado = await authService.login("operario", "clave-erronea");

  assert.equal(resultado.ok, false);
  assert.equal(resultado.bloqueado, true);
  assert.match(resultado.mensaje, /bloqueada temporalmente/);
  assert.equal(actualizaciones(consultas).length, 1);
  const [auditoria] = auditorias(consultas);
  assert.equal(auditoria.params[1], "BLOQUEO_CUENTA");
});

test("una cuenta bloqueada se rechaza aunque la contraseña sea correcta", async (t) => {
  const consultas = simularUsuario(t, { bloqueado: 1, bloqueado_hasta: new Date() });

  const resultado = await authService.login("operario", "clave-correcta");

  assert.equal(resultado.ok, false);
  assert.equal(resultado.bloqueado, true);
  assert.equal(resultado.token, undefined);
  assert.equal(actualizaciones(consultas).length, 0);
});

test("un inicio de sesión correcto reinicia los intentos fallidos", async (t) => {
  const consultas = simularUsuario(t, { intentos_fallidos: 3 });

  const resultado = await authService.login("operario", "clave-correcta");

  assert.equal(resultado.ok, true);
  assert.ok(resultado.token);
  const [update] = actualizaciones(consultas);
  assert.match(update.sql, /intentos_fallidos = 0, bloqueado_hasta = NULL/);
  assert.deepEqual(update.params, [11]);
});

test("el administrador desbloquea la cuenta y la acción queda en auditoría", async (t) => {
  const consultas = simularUsuario(t);

  await usuariosService.desbloquear(11, 1);

  const [update] = actualizaciones(consultas);
  assert.match(update.sql, /intentos_fallidos = 0, bloqueado_hasta = NULL/);
  assert.deepEqual(update.params, [11]);
  const [auditoria] = auditorias(consultas);
  assert.deepEqual(auditoria.params.slice(0, 2), [1, "DESBLOQUEAR_USUARIO"]);
});
