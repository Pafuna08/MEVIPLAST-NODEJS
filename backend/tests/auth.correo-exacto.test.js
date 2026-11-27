const test = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");

const { pool } = require("../src/config/database");
const authService = require("../src/services/auth.service");

// Auditoría de seguridad (run-1). La columna correo usa utf8mb4_unicode_ci, que no distingue tildes: la
// base devuelve «ana@empresa.com» aunque se pida «ana@émpresa.com». Estas pruebas simulan esa respuesta y
// exigen que el enlace o el usuario se envíen solo ante una coincidencia exacta y a la dirección guardada.
function preparar(t, filaGuardada) {
  const entorno = { ...process.env };
  Object.assign(process.env, {
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: "587",
    SMTP_SECURE: "false",
    SMTP_USER: "mevi@prueba.test",
    SMTP_PASSWORD: "clave-smtp-prueba",
  });
  const enviados = [];
  const opcionesTransporte = [];
  const originalCrear = nodemailer.createTransport;
  nodemailer.createTransport = (opciones) => {
    opcionesTransporte.push(opciones);
    return { sendMail: async (mensaje) => { enviados.push(mensaje); } };
  };
  const consultas = [];
  const originalQuery = pool.query;
  pool.query = async (sql) => {
    consultas.push(sql);
    if (sql.startsWith("SELECT")) return [[filaGuardada], []];
    return [{ affectedRows: 1 }, []];
  };
  t.after(() => {
    nodemailer.createTransport = originalCrear;
    pool.query = originalQuery;
    process.env = entorno;
  });
  return { enviados, consultas, opcionesTransporte };
}

test("un correo equivalente solo por la collation no recibe el enlace de recuperación ni crea token", async (t) => {
  const { enviados, consultas } = preparar(t, { id: 4, correo: "ana@empresa.com" });
  await authService.solicitarRecuperacion("ana@émpresa.com");
  assert.equal(enviados.length, 0);
  assert.equal(consultas.some((sql) => sql.startsWith("INSERT INTO tokens_recuperacion")), false);
});

test("la recuperación con el correo exacto envía el enlace a la dirección guardada y exige TLS", async (t) => {
  const { enviados, opcionesTransporte } = preparar(t, { id: 4, correo: "Ana@Empresa.com" });
  await authService.solicitarRecuperacion("ana@empresa.com");
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].to, "Ana@Empresa.com");
  assert.match(enviados[0].text, /recuperar\.html\?token=[a-f0-9]{64}/);
  assert.equal(opcionesTransporte[0].requireTLS, true);
});

test("el recordatorio de usuario no se envía a un correo equivalente solo por la collation", async (t) => {
  const { enviados } = preparar(t, { usuario: "ana", correo: "ana@empresa.com" });
  await authService.recordarUsuario("ana@émpresa.com");
  assert.equal(enviados.length, 0);
});

test("el recordatorio de usuario con el correo exacto va a la dirección guardada", async (t) => {
  const { enviados } = preparar(t, { usuario: "ana", correo: "ana@empresa.com" });
  await authService.recordarUsuario("ana@empresa.com");
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].to, "ana@empresa.com");
  assert.match(enviados[0].text, /ana/);
});
