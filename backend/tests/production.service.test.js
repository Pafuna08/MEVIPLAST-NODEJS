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
      return [[{ id: 7, producto: "Adhesivo PP", materia_prima_id: null }]];
    }
    return [[], []];
  };
  t.after(() => {
    pool.getConnection = originalGetConnection;
    pool.query = originalQuery;
  });

  await productionService.actualizarOrden(7, { producto: " Adhesivo PP " }, 2);
  assert.match(updatedOrder.sql, /producto = \?/);
  assert.doesNotMatch(updatedOrder.sql, /materia_prima_id/);
  assert.deepEqual(updatedOrder.params, ["Adhesivo PP", 7]);

  queries.length = 0;
  await productionService.actualizarOrden(7, { materia_prima_id: null }, 2);
  updatedOrder = queries.find(({ sql }) => sql.startsWith("UPDATE produccion"));
  assert.match(updatedOrder.sql, /materia_prima_id = \?/);
  assert.deepEqual(updatedOrder.params, [null, 7]);
});

test("crear plantilla rechaza productos fuera del catálogo MEVIPLAST", async () => {
  await assert.rejects(
    productionService.crearPlantilla(
      { producto: "Sello fondo", cantidad: 20 },
      1,
    ),
    /línea de producto válida/,
  );
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
          supervisor_id: 2,
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

test("el supervisor solo ve las órdenes que tiene asignadas", async (t) => {
  const originalQuery = pool.query;
  let query;
  pool.query = async (sql, params) => {
    query = { sql, params };
    return [[], []];
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  await productionService.listar({ id: 12, rol: "supervisor" });
  assert.match(query.sql, /AND \(p\.supervisor_id = \? OR p\.supervisor_id IS NULL\)/);
  assert.deepEqual(query.params, [
    "Adhesivo PP",
    "Adhesivo Seguridad",
    "Sencilla PP",
    "Bolsas para la basura",
    "Cargadera",
    "Troquel riñón",
    12,
  ]);
});

test("el supervisor no puede asignar órdenes de otro supervisor", async (t) => {
  const originalGetConnection = pool.getConnection;
  let rolledBack = false;
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => assert.fail("No debe confirmar una asignación ajena"),
    rollback: async () => {
      rolledBack = true;
    },
    release: () => {},
    query: async (sql) => {
      if (sql.startsWith("SELECT id, estado, cantidad_producida")) {
        return [[{
          id: 21,
          estado: "pendiente",
          cantidad_producida: 0,
          supervisor_id: 99,
        }]];
      }
      return [[], []];
    },
  });
  t.after(() => {
    pool.getConnection = originalGetConnection;
  });

  await assert.rejects(
    productionService.asignarOperario(21, 6, { id: 12, rol: "supervisor" }),
    /órdenes que te fueron entregadas/,
  );
  assert.equal(rolledBack, true);
});
