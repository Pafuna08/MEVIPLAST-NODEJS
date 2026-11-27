const test = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");

const { pool } = require("../src/config/database");
const authService = require("../src/services/auth.service");

// CP-118 · MEVI-127: Render (plan gratuito) bloquea los puertos SMTP desde septiembre de 2025. Con BREVO_API_KEY
// la recuperación y el recordatorio salen por la API HTTPS de Brevo, sin abrir una conexión SMTP.
function preparar(t, filaGuardada, respuesta = { ok: true, status: 201, json: async () => ({ messageId: "<m@brevo>" }) }) {
  const entorno = { ...process.env };
  for (const clave of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_SECURE"]) delete process.env[clave];
  Object.assign(process.env, { BREVO_API_KEY: "clave-brevo-prueba", SMTP_FROM: "MEVIPLAST <mevi@prueba.test>" });
  const peticiones = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, opciones) => {
    peticiones.push({ url, opciones, cuerpo: JSON.parse(opciones.body) });
    return respuesta;
  };
  const originalCrear = nodemailer.createTransport;
  nodemailer.createTransport = () => { throw new Error("no debe abrir una conexión SMTP"); };
  const consultas = [];
  const originalQuery = pool.query;
  pool.query = async (sql) => {
    consultas.push(sql);
    if (sql.startsWith("SELECT")) return [[filaGuardada], []];
    return [{ affectedRows: 1 }, []];
  };
  t.after(() => {
    global.fetch = originalFetch;
    nodemailer.createTransport = originalCrear;
    pool.query = originalQuery;
    process.env = entorno;
  });
  return { peticiones, consultas };
}

test("CP-118: con BREVO_API_KEY la recuperación sale por la API HTTPS de Brevo, sin SMTP", async (t) => {
  const { peticiones } = preparar(t, { id: 4, correo: "ana@empresa.com" });
  await authService.solicitarRecuperacion("ana@empresa.com");
  assert.equal(peticiones.length, 1);
  const { url, opciones, cuerpo } = peticiones[0];
  assert.equal(url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(opciones.method, "POST");
  assert.equal(opciones.headers["api-key"], "clave-brevo-prueba");
  assert.deepEqual(cuerpo.sender, { name: "MEVIPLAST", email: "mevi@prueba.test" });
  assert.deepEqual(cuerpo.to, [{ email: "ana@empresa.com" }]);
  assert.match(cuerpo.textContent, /recuperar\.html\?token=[a-f0-9]{64}/);
  assert.match(cuerpo.htmlContent, /recuperar\.html\?token=[a-f0-9]{64}/);
});

test("CP-118: el recordatorio de usuario también sale por Brevo", async (t) => {
  const { peticiones } = preparar(t, { usuario: "ana", correo: "ana@empresa.com" });
  await authService.recordarUsuario("ana@empresa.com");
  assert.equal(peticiones.length, 1);
  assert.match(peticiones[0].cuerpo.textContent, /El usuario asociado a este correo es: ana/);
  assert.equal(peticiones[0].cuerpo.subject, "Tu usuario de MEVIPLAST");
});

test("CP-118: si Brevo rechaza el envío, el enlace se borra y la solicitud falla", async (t) => {
  const { consultas } = preparar(t, { id: 4, correo: "ana@empresa.com" }, { ok: false, status: 401, text: async () => "Key not found" });
  await assert.rejects(authService.solicitarRecuperacion("ana@empresa.com"), /Brevo/);
  assert.ok(consultas.some((sql) => sql.startsWith("DELETE FROM tokens_recuperacion WHERE usuario_id = ? AND token_hash = ?")));
});

test("CP-118: sin remitente no se intenta enviar y la API responde que falta configurar el correo", async (t) => {
  const { peticiones } = preparar(t, { id: 4, correo: "ana@empresa.com" });
  delete process.env.SMTP_FROM;
  await assert.rejects(authService.solicitarRecuperacion("ana@empresa.com"), (error) => error.code === "SMTP_NOT_CONFIGURED");
  assert.equal(peticiones.length, 0);
});
