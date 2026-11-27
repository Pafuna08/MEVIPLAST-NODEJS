const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const spec = require(path.join(__dirname, "..", "..", "docs", "api", "openapi.json"));
const rutas = require("../src/routes");

const ROLES = new Set(["admin", "supervisor", "operario", "vendedor", "almacenista"]);

// Recorre el router de /api y devuelve "MÉTODO /ruta" con el formato de OpenAPI ({id})
function rutasExpress(router, prefijo = "") {
  const lista = [];
  for (const capa of router.stack) {
    if (capa.route) {
      const ruta = (prefijo + capa.route.path).replace(/\/$/, "").replace(/:(\w+)/g, "{$1}") || "/";
      for (const metodo of Object.keys(capa.route.methods)) lista.push(`${metodo.toUpperCase()} ${ruta}`);
    } else if (capa.handle && capa.handle.stack) {
      // Express 4 guarda el prefijo de router.use() solo en la expresión regular de la capa
      const montaje = capa.regexp.source.replace(/^\^/, "").replace(/\\\/\?\(\?=\\\/\|\$\)$/, "").replace(/\\\//g, "/");
      lista.push(...rutasExpress(capa.handle, prefijo + montaje));
    }
  }
  return lista;
}

function rutasContrato() {
  return Object.entries(spec.paths).flatMap(([ruta, operaciones]) => Object.keys(operaciones).map((m) => `${m.toUpperCase()} ${ruta}`));
}

test("el contrato OpenAPI tiene exactamente las rutas registradas en Express", () => {
  const express = new Set(rutasExpress(rutas));
  const contrato = new Set(rutasContrato());
  const sinDocumentar = [...express].filter((r) => !contrato.has(r));
  const inexistentes = [...contrato].filter((r) => !express.has(r));
  assert.deepEqual(sinDocumentar, [], "rutas de Express que faltan en docs/api/openapi.json");
  assert.deepEqual(inexistentes, [], "rutas del contrato que no existen en Express");
  assert.ok(express.size >= 40, `se esperaban al menos 40 rutas y se encontraron ${express.size}`);
});

test("cada operación protegida declara sus roles y las respuestas 401 y 403", () => {
  for (const [ruta, operaciones] of Object.entries(spec.paths)) {
    for (const [metodo, op] of Object.entries(operaciones)) {
      const nombre = `${metodo.toUpperCase()} ${ruta}`;
      const publica = Array.isArray(op.security) && op.security.length === 0;
      if (publica) {
        assert.ok(ruta === "/health" || ruta.startsWith("/auth/"), `${nombre} es pública sin estar en /auth o /health`);
        continue;
      }
      assert.ok(Array.isArray(op["x-roles"]) && op["x-roles"].length > 0, `${nombre} sin x-roles`);
      for (const rol of op["x-roles"]) assert.ok(ROLES.has(rol), `${nombre}: rol desconocido ${rol}`);
      assert.ok(op.responses["401"] && op.responses["403"], `${nombre} sin 401 o 403`);
    }
  }
});
