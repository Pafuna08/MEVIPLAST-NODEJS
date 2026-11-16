const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const express = require("express");

process.env.JWT_SECRET = "test-only-secret-for-frontend-routes";

const app = require("../src/app");
const { servirFrontend, PAGINAS } = require("../src/utils/frontend");

async function iniciar(t, aplicacion) {
  const server = aplicacion.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => server.close(() => resolve())));
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

function carpetaTemporal(t) {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), "meviplast-dist-"));
  t.after(() => fs.rmSync(carpeta, { recursive: true, force: true }));
  return carpeta;
}

// Observación del instructor: desde el navegador se podían abrir el código fuente del frontend, sus
// dependencias y su configuración. Estos archivos existen en el repositorio y no deben publicarse.
test("el servidor no publica el código fuente, las dependencias ni la configuración del frontend", async (t) => {
  const base = await iniciar(t, app);
  const privados = [
    "/src/main.jsx",
    "/src/DashboardApp.jsx",
    "/src/comun/api.js",
    "/package.json",
    "/package-lock.json",
    "/vite.config.js",
    "/eslint.config.js",
    "/node_modules/react/package.json",
    "/css/login.css",
    "/js/login.js",
    "/.env",
    "/%2e%2e/backend/.env",
    "/..%2fbackend%2fpackage.json",
  ];
  for (const ruta of privados) {
    const respuesta = await fetch(`${base}${ruta}`);
    assert.equal(respuesta.status, 404, ruta);
  }
});

test("las direcciones de siempre abren la aplicación React y sus archivos compilados", async (t) => {
  const dist = carpetaTemporal(t);
  fs.writeFileSync(path.join(dist, "index.html"), "<div id=\"root\"></div><!-- base React -->");
  fs.mkdirSync(path.join(dist, "assets"));
  fs.writeFileSync(path.join(dist, "assets", "index-abc123.js"), "console.log(1)");
  const aplicacion = express();
  aplicacion.use(servirFrontend(dist));
  const base = await iniciar(t, aplicacion);

  for (const ruta of [...PAGINAS, "/recuperar.html?token=abc", "/dashboard.html?reporte=ventas&periodo=anual"]) {
    const respuesta = await fetch(`${base}${ruta}`);
    assert.equal(respuesta.status, 200, ruta);
    assert.match(await respuesta.text(), /base React/, ruta);
  }
  assert.equal((await fetch(`${base}/assets/index-abc123.js`)).status, 200);
  assert.equal((await fetch(`${base}/otra-pagina.html`)).status, 404, "una página que no existe no abre la aplicación");
});

test("sin compilar el frontend las páginas responden 404 y no un error del servidor", async (t) => {
  const aplicacion = express();
  aplicacion.use(servirFrontend(carpetaTemporal(t)));
  const base = await iniciar(t, aplicacion);
  assert.equal((await fetch(`${base}/login.html`)).status, 404);
});
