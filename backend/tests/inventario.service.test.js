const test = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../src/config/database");
const inventoryService = require("../src/services/inventario.service");

test("una salida manual descuenta stock y registra el ledger antes de confirmar", async (t) => {
  const originalGetConnection = pool.getConnection;
  const originalQuery = pool.query;
  const statements = [];
  let committed = false;

  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {
      committed = true;
    },
    rollback: async () => assert.fail("No debe revertirse una salida válida"),
    release: () => {},
    query: async (sql, params = []) => {
      statements.push({ sql, params });
      if (sql.startsWith("SELECT id, producto")) {
        return [[{ id: 5, producto: "Bolsa", cantidad: 10 }]];
      }
      return [[], []];
    },
  });
  pool.query = async (sql) => {
    if (sql.startsWith("SELECT * FROM inventario")) {
      return [[{ id: 5, producto: "Bolsa", cantidad: 7 }]];
    }
    return [[], []];
  };
  t.after(() => {
    pool.getConnection = originalGetConnection;
    pool.query = originalQuery;
  });

  const item = await inventoryService.registrarSalida(5, 3, 8);
  assert.equal(item.cantidad, 7);
  assert.equal(committed, true);
  assert.ok(
    statements.findIndex(({ sql }) => sql.startsWith("UPDATE inventario")) <
      statements.findIndex(({ sql }) =>
        sql.startsWith("INSERT INTO movimientos_inventario"),
      ),
  );
  const ledger = statements.find(({ sql }) =>
    sql.startsWith("INSERT INTO movimientos_inventario"),
  );
  assert.deepEqual(ledger.params, [5, 8, 3]);
});
