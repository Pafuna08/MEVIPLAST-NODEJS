const test = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../src/config/database");
const materiaPrimaService = require("../src/services/materiaPrima.service");

test("crear registra una bobina con sus especificaciones y el peso como existencia inicial", async (t) => {
  const originalGetConnection = pool.getConnection;
  const originalQuery = pool.query;
  const insertQueries = [];
  let committed = false;
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {
      committed = true;
    },
    rollback: async () => assert.fail("No debe revertirse un material válido"),
    release: () => {},
    query: async (sql, params = []) => {
      insertQueries.push({ sql, params });
      if (sql.startsWith("INSERT INTO materia_prima")) {
        return [{ insertId: 7 }, []];
      }
      return [{ insertId: 8 }, []];
    },
  });
  pool.query = async (sql, params = []) => {
    if (sql.startsWith("SELECT * FROM materia_prima")) {
      return [[{ id: 7, ...params }]];
    }
    return [[], []];
  };
  t.after(() => {
    pool.getConnection = originalGetConnection;
    pool.query = originalQuery;
  });

  await materiaPrimaService.crear(
    {
      tipo: "PEBD",
      medida: "6 x 12",
      calibre: "0.95",
      color: "Transparente",
      peso_rollo: "25.5",
    },
    2,
  );

  const materialInsert = insertQueries.find(({ sql }) =>
    sql.startsWith("INSERT INTO materia_prima"),
  );
  const movementInsert = insertQueries.find(({ sql }) =>
    sql.startsWith("INSERT INTO movimientos_materia_prima"),
  );
  assert.equal(committed, true);
  assert.deepEqual(materialInsert.params, [
    "Bobina o rollo de polietileno de baja densidad (PEBD) - 6 x 12 - calibre 0.95 - Transparente",
    "PEBD",
    "6 x 12",
    "0.95",
    "Transparente",
    25.5,
    25.5,
  ]);
  assert.deepEqual(movementInsert.params, [
    7,
    2,
    25.5,
    "Peso inicial del rollo al registrar materia prima",
  ]);
});

test("crear rechaza un material no permitido o un peso de rollo inválido", async () => {
  await assert.rejects(
    materiaPrimaService.crear(
      { tipo: "Resina", medida: "6 x 12", calibre: "1", color: "Negro", peso_rollo: 10 },
      2,
    ),
    { statusCode: 400, message: "Selecciona un material válido" },
  );
  await assert.rejects(
    materiaPrimaService.crear(
      { tipo: "PP", medida: "6 x 12", calibre: "1", color: "Negro", peso_rollo: 0 },
      2,
    ),
    { statusCode: 400, message: "El peso del rollo debe ser mayor que cero" },
  );
});

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
