const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");

process.env.JWT_SECRET = "test-only-secret-for-health-and-cors";
process.env.CORS_ORIGINS = "http://192.168.1.10:3000, http://localhost:5173";

const app = require("../src/app");
const { pool } = require("../src/config/database");

async function iniciar(t) {
  const server = app.listen(0, "127.0.0.1");
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}/api`;
}

function simularBaseDatos(t, implementacion) {
  const originalQuery = pool.query;
  pool.query = implementacion;
  t.after(() => {
    pool.query = originalQuery;
  });
}

test("health responde 200 cuando la base de datos está disponible", async (t) => {
  simularBaseDatos(t, async () => [[{ 1: 1 }], []]);
  const baseUrl = await iniciar(t);

  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { estado: "ok", baseDatos: "ok" });
});

test("health responde 503 sin exponer el error cuando la base de datos falla", async (t) => {
  simularBaseDatos(t, async () => {
    throw new Error("connect ECONNREFUSED 127.0.0.1:3306");
  });
  const baseUrl = await iniciar(t);

  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 503);
  const cuerpo = await response.text();
  assert.doesNotMatch(cuerpo, /ECONNREFUSED/);
});

test("CORS solo autoriza los orígenes configurados", async (t) => {
  simularBaseDatos(t, async () => [[{ 1: 1 }], []]);
  const baseUrl = await iniciar(t);

  const permitido = await fetch(`${baseUrl}/health`, { headers: { Origin: "http://192.168.1.10:3000" } });
  assert.equal(permitido.headers.get("access-control-allow-origin"), "http://192.168.1.10:3000");

  const ajeno = await fetch(`${baseUrl}/health`, { headers: { Origin: "https://sitio-ajeno.example" } });
  assert.equal(ajeno.headers.get("access-control-allow-origin"), null);
});
