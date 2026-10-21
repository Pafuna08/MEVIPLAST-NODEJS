const test = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../src/config/database");
const productionService = require("../src/services/produccion.service");

test("actualizarOrden exige campos y no permite campos desconocidos", async () => {
  await assert.rejects(
    productionService.actualizarOrden(1, {}, 2),
    /al menos un campo/,
  );
  await assert.rejects(
    productionService.actualizarOrden(1, { estado: "finalizado" }, 2),
    /campos no editables/,
  );
});

test("actualizarOrden preserva relaciones omitidas y permite limpiar materia prima", async (t) => {
  const originalGetConnection = pool.getConnection;
  const originalQuery = pool.query;
  const queries = [];
  let updatedOrder;

  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql, params = []) => {
      queries.push({ sql, params });
      if (sql.startsWith("SELECT id, estado")) {
        return [[{ id: 7, estado: "pendiente", cantidad_producida: 0 }]];
      }
      if (sql.startsWith("UPDATE produccion")) {
        updatedOrder = { sql, params };
      }
      return [[], []];
    },
  });
  pool.query = async (sql) => {
    if (sql.startsWith("SELECT * FROM produccion")) {
      return [[{ id: 7, producto: "Bolsa", materia_prima_id: null }]];
    }
    return [[], []];
  };
  t.after(() => {
    pool.getConnection = originalGetConnection;
    pool.query = originalQuery;
  });

  await productionService.actualizarOrden(7, { producto: " Bolsa nueva " }, 2);
  assert.match(updatedOrder.sql, /producto = \?/);
  assert.doesNotMatch(updatedOrder.sql, /materia_prima_id/);
  assert.deepEqual(updatedOrder.params, ["Bolsa nueva", 7]);

  queries.length = 0;
  await productionService.actualizarOrden(7, { materia_prima_id: null }, 2);
  updatedOrder = queries.find(({ sql }) => sql.startsWith("UPDATE produccion"));
  assert.match(updatedOrder.sql, /materia_prima_id = \?/);
  assert.deepEqual(updatedOrder.params, [null, 7]);
});

test("no se puede finalizar una orden sin completar la meta", async (t) => {
  const originalGetConnection = pool.getConnection;
  let rollbackCount = 0;
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => assert.fail("No debe confirmar una transición inválida"),
    rollback: async () => {
      rollbackCount += 1;
    },
    release: () => {},
    query: async (sql) => {
      if (sql.startsWith("SELECT id, estado")) {
        return [[{
          id: 9,
          estado: "en_proceso",
          cantidad: 10,
          cantidad_producida: 4,
          responsable_id: 3,
        }]];
      }
      return [[], []];
    },
  });
  t.after(() => {
    pool.getConnection = originalGetConnection;
  });

  await assert.rejects(
    productionService.cambiarEstado(9, "finalizado", { id: 2, rol: "supervisor" }),
    /meta pendiente/,
  );
  assert.equal(rollbackCount, 1);
});
