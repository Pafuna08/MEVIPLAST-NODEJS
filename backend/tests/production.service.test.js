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
      if (sql.startsWith("SELECT id, producto, estado")) {
        return [[{ id: 7, producto: "Adhesivo PP", estado: "pendiente", cantidad_producida: 0 }]];
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

function simularAvance(t, orden, { inventarioId = 40 } = {}) {
  const originalGetConnection = pool.getConnection;
  const originalQuery = pool.query;
  const estado = { queries: [], committed: false, rolledBack: false };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {
      estado.committed = true;
    },
    rollback: async () => {
      estado.rolledBack = true;
    },
    release: () => {},
    query: async (sql, params = []) => {
      estado.queries.push({ sql, params });
      if (sql.startsWith("SELECT * FROM produccion")) return [[orden]];
      if (sql.startsWith("SELECT id FROM inventario")) {
        return [inventarioId ? [{ id: inventarioId }] : []];
      }
      if (sql.startsWith("INSERT INTO inventario")) return [{ insertId: 77 }];
      return [{ insertId: 1 }];
    },
  });
  pool.query = async () => [[orden], []];
  t.after(() => {
    pool.getConnection = originalGetConnection;
    pool.query = originalQuery;
  });
  return estado;
}

test("registrar avance que completa la meta finaliza la orden e incrementa el inventario en la transacción", async (t) => {
  const estado = simularAvance(t, {
    id: 5,
    producto: "Cargadera",
    cantidad: 100,
    cantidad_producida: 60,
    responsable_id: 3,
    estado: "en_proceso",
  });

  await productionService.registrarAvance(5, { cantidad: 40, lote: "L-01" }, { id: 3, rol: "operario" });

  const orden = estado.queries.find(({ sql }) => sql.startsWith("UPDATE produccion"));
  assert.deepEqual(orden.params.slice(0, 2), [100, "finalizado"]);
  const inventario = estado.queries.find(({ sql }) => sql.startsWith("UPDATE inventario"));
  assert.deepEqual(inventario.params, [40, 40]);
  const movimiento = estado.queries.find(({ sql }) => sql.startsWith("INSERT INTO movimientos_inventario"));
  assert.match(movimiento.sql, /'produccion'/);
  assert.deepEqual(movimiento.params, [40, 3, 5, 40]);
  assert.equal(estado.committed, true);
});

test("registrar avance crea la existencia del producto si todavía no existe", async (t) => {
  const estado = simularAvance(
    t,
    { id: 6, producto: "Sencilla PP", cantidad: 50, cantidad_producida: 0, responsable_id: 3, estado: "pendiente" },
    { inventarioId: null },
  );

  await productionService.registrarAvance(6, { cantidad: 20 }, { id: 3, rol: "operario" });

  const orden = estado.queries.find(({ sql }) => sql.startsWith("UPDATE produccion"));
  assert.deepEqual(orden.params.slice(0, 2), [20, "en_proceso"]);
  const creado = estado.queries.find(({ sql }) => sql.startsWith("INSERT INTO inventario"));
  assert.deepEqual(creado.params, ["Sencilla PP", "Sencilla PP", 20, "Produccion"]);
  const movimiento = estado.queries.find(({ sql }) => sql.startsWith("INSERT INTO movimientos_inventario"));
  assert.equal(movimiento.params[0], 77);
  assert.equal(estado.committed, true);
});

test("registrar avance de una orden con variante suma a esa variante del inventario", async (t) => {
  const estado = simularAvance(t, {
    id: 8,
    producto: "Cargadera",
    medida: "40x60 cm",
    calibre: "2",
    color: "Negro",
    cantidad: 100,
    cantidad_producida: 0,
    responsable_id: 3,
    estado: "en_proceso",
  });

  await productionService.registrarAvance(8, { cantidad: 30 }, { id: 3, rol: "operario" });

  const busqueda = estado.queries.find(({ sql }) => sql.startsWith("SELECT id FROM inventario"));
  assert.match(busqueda.sql, /medida = \? AND calibre = \? AND color = \?/);
  assert.deepEqual(busqueda.params, ["Cargadera", "40x60 cm", "2", "Negro"]);
  const inventario = estado.queries.find(({ sql }) => sql.startsWith("UPDATE inventario"));
  assert.deepEqual(inventario.params, [30, 40]);
});

test("registrar avance crea la variante de la orden con ubicación por asignar si no existe", async (t) => {
  const estado = simularAvance(
    t,
    { id: 9, producto: "Sencilla PP", medida: "20x30 cm", calibre: "1.5", color: "Transparente", cantidad: 50, cantidad_producida: 0, responsable_id: 3, estado: "pendiente" },
    { inventarioId: null },
  );

  await productionService.registrarAvance(9, { cantidad: 20 }, { id: 3, rol: "operario" });

  const creado = estado.queries.find(({ sql }) => sql.startsWith("INSERT INTO inventario"));
  assert.deepEqual(creado.params, [
    "Sencilla PP · 20x30 cm · calibre 1.5 · Transparente",
    "Sencilla PP",
    "20x30 cm",
    "1.5",
    "Transparente",
    20,
    "Por ubicar",
  ]);
});

test("crear orden exige medida, calibre y color", async () => {
  await assert.rejects(
    productionService.crear(
      { producto: "Cargadera", cantidad: 10, medida: "40x60 cm", calibre: "", color: "Negro", supervisor_id: 2 },
      { id: 1, rol: "admin" },
    ),
    /calibre es obligatorio/,
  );
});

test("actualizarOrden exige medida, calibre y color juntos", async () => {
  await assert.rejects(
    productionService.actualizarOrden(1, { medida: "40x60 cm" }, 2),
    /medida, calibre y color juntos/,
  );
});

test("registrar avance rechaza superar la meta pendiente sin modificar el inventario", async (t) => {
  const estado = simularAvance(t, {
    id: 5,
    producto: "Cargadera",
    cantidad: 100,
    cantidad_producida: 60,
    responsable_id: 3,
    estado: "en_proceso",
  });

  await assert.rejects(
    productionService.registrarAvance(5, { cantidad: 50 }, { id: 3, rol: "operario" }),
    /supera la meta pendiente \(40\)/,
  );
  assert.equal(estado.committed, false);
  assert.equal(estado.rolledBack, true);
  assert.equal(estado.queries.some(({ sql }) => /^(UPDATE|INSERT)/.test(sql)), false);
});

test("un operario no puede registrar avance en la orden de otro operario", async (t) => {
  const estado = simularAvance(t, {
    id: 5,
    producto: "Cargadera",
    cantidad: 100,
    cantidad_producida: 0,
    responsable_id: 3,
    estado: "en_proceso",
  });

  await assert.rejects(
    productionService.registrarAvance(5, { cantidad: 10 }, { id: 8, rol: "operario" }),
    /tus tareas asignadas/,
  );
  assert.equal(estado.rolledBack, true);
  assert.equal(estado.queries.some(({ sql }) => /^(UPDATE|INSERT)/.test(sql)), false);
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
