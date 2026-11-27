const test = require("node:test");
const assert = require("node:assert/strict");

const { pool } = require("../src/config/database");
const materiaPrimaService = require("../src/services/materiaPrima.service");

// HU-010 / RF-015: costo y número de factura en las compras de materia prima
function conexionSimulada(t) {
  const original = pool.getConnection;
  const inserciones = [];
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql, valores) => {
      if (sql.includes("FROM materia_prima WHERE id = ? FOR UPDATE")) return [[{ id: 3, cantidad: 100 }], []];
      if (sql.startsWith("INSERT INTO movimientos_materia_prima")) inserciones.push({ sql, valores });
      return [{ affectedRows: 1, insertId: 55 }, []];
    },
  });
  const originalQuery = pool.query;
  pool.query = async () => [[{ id: 3, nombre: "Bobina" }], []];
  t.after(() => { pool.getConnection = original; pool.query = originalQuery; });
  return inserciones;
}

test("una compra guarda su costo y su número de factura", async (t) => {
  const inserciones = conexionSimulada(t);
  await materiaPrimaService.registrarMovimiento(3, { tipo: "compra", cantidad: "150", costo: "1250000.50", factura: " FV-4521 " }, { id: 6, rol: "almacenista" });
  assert.match(inserciones[0].sql, /costo, factura/);
  assert.deepEqual(inserciones[0].valores.slice(4, 7), [150, 1250000.5, "FV-4521"]);
});

test("una compra sin costo ni factura sigue siendo válida", async (t) => {
  const inserciones = conexionSimulada(t);
  await materiaPrimaService.registrarMovimiento(3, { tipo: "compra", cantidad: 10 }, { id: 6, rol: "almacenista" });
  assert.deepEqual(inserciones[0].valores.slice(5, 7), [null, null]);
});

test("el costo y la factura se rechazan fuera de una compra o con formato inválido", async (t) => {
  conexionSimulada(t);
  const actor = { id: 6, rol: "almacenista" };
  await assert.rejects(materiaPrimaService.registrarMovimiento(3, { tipo: "ajuste_entrada", cantidad: 1, costo: 100 }, actor), { statusCode: 400 });
  await assert.rejects(materiaPrimaService.registrarMovimiento(3, { tipo: "compra", cantidad: 1, costo: -5 }, actor), { statusCode: 400 });
  await assert.rejects(materiaPrimaService.registrarMovimiento(3, { tipo: "compra", cantidad: 1, factura: "<script>" }, actor), { statusCode: 400 });
});
