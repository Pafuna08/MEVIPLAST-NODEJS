const test = require("node:test");
const assert = require("node:assert/strict");

const { pool } = require("../src/config/database");
const inventarioService = require("../src/services/inventario.service");

function simularConsultas(t, respuestas = () => [[], []]) {
  const original = pool.query;
  const consultas = [];
  pool.query = async (sql, valores) => {
    consultas.push({ sql, valores });
    return respuestas(sql);
  };
  t.after(() => { pool.query = original; });
  return consultas;
}

// RF-019 / CP-112: consultar el inventario de producto terminado y su historial de movimientos
test("el inventario lista solo las líneas del catálogo, con valores enlazados y en orden fijo", async (t) => {
  const consultas = simularConsultas(t, (sql) => {
    if (sql.includes("FROM lineas_producto")) return [[{ nombre: "Cargadera" }, { nombre: "Sencilla PP" }], []];
    return [[{ id: 3, familia: "Cargadera", medida: "T20", calibre: "2", color: "Blanco", cantidad: 250 }], []];
  });
  const filas = await inventarioService.listar();
  const consulta = consultas.find((c) => c.sql.includes("FROM inventario"));
  assert.match(consulta.sql, /WHERE familia IN \(\?, \?\)/);
  assert.match(consulta.sql, /ORDER BY familia, medida, calibre, color/);
  assert.deepEqual(consulta.valores, ["Cargadera", "Sencilla PP"]);
  assert.equal(filas.length, 1);
  assert.equal(filas[0].cantidad, 250);
});

test("el historial de movimientos sale del más reciente al más antiguo y se filtra por producto", async (t) => {
  const consultas = simularConsultas(t);
  await inventarioService.listarMovimientos(null, "admin");
  await inventarioService.listarMovimientos(5, "almacenista");
  const [todos, uno] = consultas;
  assert.match(todos.sql, /ORDER BY m\.fecha DESC, m\.id DESC/);
  assert.doesNotMatch(todos.sql, /WHERE m\.inventario_id/);
  assert.deepEqual(todos.valores, []);
  assert.match(uno.sql, /WHERE m\.inventario_id = \?/);
  assert.deepEqual(uno.valores, [5]);
});

test("el historial muestra quién registró cada movimiento y su origen (orden o venta)", async (t) => {
  const consultas = simularConsultas(t);
  await inventarioService.listarMovimientos(null, "admin");
  const sql = consultas[0].sql;
  assert.match(sql, /u\.nombre AS registrado_por/);
  assert.match(sql, /p\.id AS orden_id/);
  assert.match(sql, /v\.cliente\s+AS cliente_venta/);
});
