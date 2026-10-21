const test = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../src/config/database");
const materiaPrimaService = require("../src/services/materiaPrima.service");

test("un movimiento de salida insuficiente se revierte sin actualizar el saldo", async (t) => {
  const originalGetConnection = pool.getConnection;
  let rollbackCount = 0;
  const mutations = [];
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => assert.fail("No debe confirmar una salida sin stock"),
    rollback: async () => {
      rollbackCount += 1;
    },
    release: () => {},
    query: async (sql) => {
      if (sql.startsWith("SELECT id, cantidad")) {
        return [[{ id: 4, cantidad: 2 }]];
      }
      mutations.push(sql);
      return [[], []];
    },
  });
  t.after(() => {
    pool.getConnection = originalGetConnection;
  });

  await assert.rejects(
    materiaPrimaService.registrarMovimiento(
      4,
      { tipo: "ajuste_salida", cantidad: 3 },
      { id: 2, rol: "almacenista" },
    ),
    /Stock insuficiente/,
  );
  assert.equal(rollbackCount, 1);
  assert.deepEqual(mutations, []);
});

test("una compra actualiza saldo e inserta su movimiento dentro de la misma transacción", async (t) => {
  const originalGetConnection = pool.getConnection;
  const originalQuery = pool.query;
  const connectionQueries = [];
  let committed = false;
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {
      committed = true;
    },
    rollback: async () => assert.fail("No debe revertirse una compra válida"),
    release: () => {},
    query: async (sql, params = []) => {
      connectionQueries.push({ sql, params });
      if (sql.startsWith("SELECT id, cantidad")) {
        return [[{ id: 4, cantidad: 2 }]];
      }
      return [{ insertId: 11 }, []];
    },
  });
  pool.query = async (sql) => {
    if (sql.startsWith("SELECT * FROM materia_prima")) {
      return [[{ id: 4, cantidad: 7 }]];
    }
    return [[], []];
  };
  t.after(() => {
    pool.getConnection = originalGetConnection;
    pool.query = originalQuery;
  });

  await materiaPrimaService.registrarMovimiento(
    4,
    { tipo: "compra", cantidad: 5 },
    { id: 2, rol: "almacenista" },
  );
  assert.equal(committed, true);
  const stockUpdate = connectionQueries.find(({ sql }) =>
    sql.startsWith("UPDATE materia_prima"),
  );
  const movementInsert = connectionQueries.find(({ sql }) =>
    sql.startsWith("INSERT INTO movimientos_materia_prima"),
  );
  assert.deepEqual(stockUpdate.params, [5, 4]);
  assert.deepEqual(movementInsert.params.slice(0, 5), [4, 2, null, "compra", 5]);
});
