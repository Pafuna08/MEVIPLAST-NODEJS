const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");

const app = require("../src/app");

// DEF-043: sin el correo configurado, la recuperación responde 503 con un mensaje que nombra las dos formas de
// configurarlo (Brevo en Render, SMTP en local), no solo SMTP: en Render el correo sale por la API de Brevo
const VARIABLES = ["BREVO_API_KEY", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_SECURE", "SMTP_FROM"];

async function iniciar(t) {
  const entorno = { ...process.env };
  for (const clave of VARIABLES) delete process.env[clave];
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  t.after(() => { process.env = entorno; });
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

for (const ruta of ["/api/auth/recuperar-password", "/api/auth/recordar-usuario"]) {
  test(`DEF-043: ${ruta} sin correo configurado responde 503 y nombra Brevo y SMTP`, async (t) => {
    const base = await iniciar(t);
    const respuesta = await fetch(`${base}${ruta}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: "ana@empresa.com" }),
    });
    assert.equal(respuesta.status, 503);
    const { mensaje } = await respuesta.json();
    assert.match(mensaje, /no está disponible/);
    assert.match(mensaje, /Brevo/);
    assert.match(mensaje, /SMTP/);
  });
}
