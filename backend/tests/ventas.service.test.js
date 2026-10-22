const test = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../src/config/database");
const salesService = require("../src/services/ventas.service");

test("el vendedor solo consulta sus propias ventas", async (t) => {
  const originalQuery = pool.query;
  let query;
  pool.query = async (sql, params) => {
    query = { sql, params };
    return [[], []];
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  await salesService.listar({ id: 12, rol: "vendedor" });
  assert.match(query.sql, /WHERE v\.usuario_id = \?/);
  assert.deepEqual(query.params, [12]);
});
