const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { once } = require("node:events");
const express = require("express");

process.env.JWT_SECRET = "test-only-secret-for-api-docs";

const app = require("../src/app");
const { servirDocumentacionApi } = require("../src/utils/apiDocs");
const spec = require(path.join(__dirname, "..", "..", "docs", "api", "openapi.json"));

async function iniciar(t, aplicacion) {
  const server = aplicacion.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => server.close(() => resolve())));
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

// Pedido del instructor: documentar la API con Swagger. La página se arma con docs/api/openapi.json,
// el contrato que openapi.test.js compara con las rutas de Express.
test("Swagger UI se publica en /api-docs con el contrato OpenAPI del repositorio", async (t) => {
  const base = await iniciar(t, app);

  for (const ruta of ["/api-docs", "/api-docs/"]) {
    const pagina = await fetch(`${base}${ruta}`);
    assert.equal(pagina.status, 200, ruta);
    assert.match(pagina.headers.get("content-type"), /text\/html/, ruta);
    const html = await pagina.text();
    assert.match(html, /swagger-ui/, ruta);
    assert.match(html, /API MEVIPLAST/, ruta);
  }

  // Los archivos de Swagger UI vienen en el paquete: la página funciona sin internet (red local de la empresa)
  const inicio = await fetch(`${base}/api-docs/swagger-ui-init.js`);
  assert.equal(inicio.status, 200);
  assert.match(await inicio.text(), /API MEVIPLAST/);
  assert.equal((await fetch(`${base}/api-docs/swagger-ui-bundle.js`)).status, 200);

  const contrato = await fetch(`${base}/api-docs/openapi.json`);
  assert.equal(contrato.status, 200);
  assert.deepEqual(await contrato.json(), spec);
});

test("la documentación no cambia la API: sus rutas siguen exigiendo token y responden igual", async (t) => {
  const base = await iniciar(t, app);
  // Las pruebas unitarias usan una base que no existe: health responde 503 (sin base), no 404
  assert.ok([200, 503].includes((await fetch(`${base}/api/health`)).status));
  assert.equal((await fetch(`${base}/api/usuarios`)).status, 401);
  assert.equal((await fetch(`${base}/api/no-existe`)).status, 404);
  assert.equal((await fetch(`${base}/api/docs`)).status, 404, "la documentación no queda dentro de /api");
});

test("con API_DOCS=off la documentación no se publica", async (t) => {
  const aplicacion = express();
  aplicacion.use(servirDocumentacionApi({ habilitada: false }));
  const base = await iniciar(t, aplicacion);
  assert.equal((await fetch(`${base}/api-docs/`)).status, 404);
  assert.equal((await fetch(`${base}/api-docs/openapi.json`)).status, 404);
});

test("sin el archivo del contrato la aplicación arranca y /api-docs responde 404", async (t) => {
  const aplicacion = express();
  aplicacion.use(servirDocumentacionApi({ habilitada: true, contrato: path.join(__dirname, "no-existe.json") }));
  const base = await iniciar(t, aplicacion);
  assert.equal((await fetch(`${base}/api-docs/`)).status, 404);
});
