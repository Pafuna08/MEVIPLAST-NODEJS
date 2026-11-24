const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const bcrypt = require("bcryptjs");

process.env.JWT_SECRET = "test-only-secret-for-security-audit";

const { pool } = require("../src/config/database");
const app = require("../src/app");
const authService = require("../src/services/auth.service");
const inventarioService = require("../src/services/inventario.service");
const lineasService = require("../src/services/lineas.service");
const materiaPrimaService = require("../src/services/materiaPrima.service");
const { sanitizarTexto } = require("../src/utils/sanitizar");

// Correcciones de los hallazgos 4 a 10 de la auditoría de seguridad (run-1)

test("las respuestas prohíben mostrarse en marcos de otro sitio y no anuncian Express", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  // /api-docs/ es HTML servido por la aplicación (el build del panel no existe en el CI)
  for (const ruta of ["/api/usuarios", "/api-docs/"]) {
    const respuesta = await fetch(`${base}${ruta}`);
    assert.equal(respuesta.headers.get("x-frame-options"), "DENY", ruta);
    assert.match(respuesta.headers.get("content-security-policy") || "", /frame-ancestors 'none'/, ruta);
    assert.equal(respuesta.headers.get("x-powered-by"), null, ruta);
  }
});

test("un token de recuperación inexistente se rechaza sin calcular bcrypt", async (t) => {
  const originalQuery = pool.query;
  const originalHash = bcrypt.hash;
  let hashes = 0;
  pool.query = async () => [[], []];
  bcrypt.hash = async (...args) => { hashes += 1; return originalHash(...args); };
  t.after(() => { pool.query = originalQuery; bcrypt.hash = originalHash; });
  await assert.rejects(authService.restablecerPassword("a".repeat(64), "password1"), { status: 400 });
  assert.equal(hashes, 0);
});

test("el historial de inventario no da al supervisor el cliente de las ventas (CR-021)", async (t) => {
  const originalQuery = pool.query;
  const consultas = [];
  pool.query = async (sql) => { consultas.push(sql); return [[], []]; };
  t.after(() => { pool.query = originalQuery; });
  await inventarioService.listarMovimientos(null, "supervisor");
  await inventarioService.listarMovimientos(null, "almacenista");
  assert.match(consultas[0], /NULL AS cliente_venta/);
  assert.match(consultas[1], /v\.cliente AS cliente_venta/);
});

test("validar una línea dentro de una transacción usa la conexión de la transacción, no otra del pool", async (t) => {
  const originalQuery = pool.query;
  pool.query = async () => assert.fail("no debe pedir otra conexión al pool");
  t.after(() => { pool.query = originalQuery; });
  const conexion = { query: async () => [[{ nombre: "Sencilla PP" }, { nombre: "Línea nueva" }], []] };
  assert.deepEqual(await lineasService.paraValidar("Línea nueva", conexion), ["Sencilla PP", "Línea nueva"]);
});

test("un supervisor no registra consumo de bobina en la orden de otro supervisor", async (t) => {
  const originalGetConnection = pool.getConnection;
  let revertido = false;
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => assert.fail("no debe guardar"),
    rollback: async () => { revertido = true; },
    release: () => {},
    query: async (sql) => {
      if (sql.includes("FROM materia_prima")) return [[{ id: 3, cantidad: 100 }], []];
      if (sql.includes("FROM produccion")) return [[{ id: 7, materia_prima_id: 3, estado: "en_proceso", supervisor_id: 20 }], []];
      return [{ affectedRows: 1 }, []];
    },
  });
  t.after(() => { pool.getConnection = originalGetConnection; });
  await assert.rejects(
    materiaPrimaService.registrarMovimiento(3, { tipo: "consumo_produccion", cantidad: 1, produccion_id: 7 }, { id: 21, rol: "supervisor" }),
    /otro supervisor/,
  );
  assert.equal(revertido, true);
});

test("el sanitizador elimina U+FFFE y U+FFFF, que XML prohíbe en los Excel", () => {
  assert.equal(sanitizarTexto("Cliente￿ X￾"), "Cliente X");
});
