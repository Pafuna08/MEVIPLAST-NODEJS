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

test("crear plantilla exige la variante y la guarda", async (t) => {
  await assert.rejects(
    productionService.crearPlantilla({ producto: "Cargadera", cantidad: 20, medida: "15 x 20" }, 1),
    /calibre es obligatorio/,
  );

  const originalQuery = pool.query;
  let insert;
  pool.query = async (sql, params) => {
    if (sql.startsWith("INSERT INTO plantillas_produccion")) {
      insert = params;
      return [{ insertId: 4 }];
    }
    return [[{ id: 4 }]];
  };
  t.after(() => {
    pool.query = originalQuery;
  });
  await productionService.crearPlantilla(
    { producto: "Cargadera", medida: " 15 x 20 ", calibre: "2", color: "Blanco", cantidad: 300 },
    1,
  );
  assert.deepEqual(insert.slice(0, 5), ["Cargadera", "15 x 20", "2", "Blanco", 300]);
});

test("el administrador y el supervisor solo cancelan; nadie finaliza a mano (CR-013)", async (t) => {
  const originalGetConnection = pool.getConnection;
  const originalQuery = pool.query;
  const estado = { rollbacks: 0, commits: 0, actualizacion: null };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {
      estado.commits += 1;
    },
    rollback: async () => {
      estado.rollbacks += 1;
    },
    release: () => {},
    query: async (sql, params) => {
      if (sql.startsWith("SELECT id, estado")) {
        return [[{ id: 9, estado: "en_proceso", cantidad: 10, cantidad_producida: 10, responsable_id: 3, supervisor_id: 2 }]];
      }
      if (sql.startsWith("UPDATE produccion")) estado.actualizacion = params;
      return [[], []];
    },
  });
  pool.query = async () => [[{ id: 9, estado: "cancelado" }], []];
  t.after(() => {
    pool.getConnection = originalGetConnection;
    pool.query = originalQuery;
  });

  await assert.rejects(
    productionService.cambiarEstado(9, "finalizado", { id: 2, rol: "supervisor" }),
    /solo puedes cancelarla/,
  );
  await assert.rejects(
    productionService.cambiarEstado(9, "en_proceso", { id: 1, rol: "admin" }),
    /solo puedes cancelarla/,
  );
  assert.equal(estado.rollbacks, 2);
  assert.equal(estado.commits, 0);

  await productionService.cambiarEstado(9, "cancelado", { id: 2, rol: "supervisor" });
  assert.deepEqual(estado.actualizacion, ["cancelado", "cancelado", 9]);
  assert.equal(estado.commits, 1);
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
  // Abiertas primero y, entre ellas, por prioridad (alta, media, baja)
  assert.match(query.sql, /ORDER BY p\.estado IN \('finalizado', 'cancelado'\),\s+CASE .* FIELD\(p\.prioridad, 'alta', 'media', 'baja'\) END/s);
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

  await productionService.registrarAvance(5, { cantidad: 40 }, { id: 3, rol: "operario" });

  const orden = estado.queries.find(({ sql }) => sql.startsWith("UPDATE produccion"));
  assert.deepEqual(orden.params.slice(0, 2), [100, "finalizado"]);
  const inventario = estado.queries.find(({ sql }) => sql.startsWith("UPDATE inventario"));
  assert.deepEqual(inventario.params, [40, 40]);
  const movimiento = estado.queries.find(({ sql }) => sql.startsWith("INSERT INTO movimientos_inventario"));
  assert.match(movimiento.sql, /'produccion'/);
  assert.deepEqual(movimiento.params, [40, 3, 5, 40, null]);
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

test("la observación del avance queda en el movimiento y no puede superar 255 caracteres", async (t) => {
  const estado = simularAvance(t, {
    id: 5, producto: "Cargadera", cantidad: 100, cantidad_producida: 0, responsable_id: 3, estado: "en_proceso",
  });
  await productionService.registrarAvance(5, { cantidad: 10, observaciones: "  Turno noche  " }, { id: 3, rol: "operario" });
  const movimiento = estado.queries.find(({ sql }) => sql.startsWith("INSERT INTO movimientos_inventario"));
  assert.equal(movimiento.params.at(-1), "Turno noche");

  await assert.rejects(
    productionService.registrarAvance(5, { cantidad: 10, observaciones: "x".repeat(256) }, { id: 3, rol: "operario" }),
    /255 caracteres/,
  );
});

test("mis registros devuelve solo los avances del operario en el periodo", async (t) => {
  const originalQuery = pool.query;
  let consulta;
  pool.query = async (sql, params) => {
    consulta = { sql, params };
    return [[
      { id: 2, fecha: "2026-10-27 10:00:00", cantidad: "30", orden_id: 5, observaciones: null, producto: "Cargadera" },
      { id: 1, fecha: "2026-10-27 08:00:00", cantidad: "20", orden_id: 5, observaciones: "Inicio", producto: "Cargadera" },
    ]];
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const resultado = await productionService.misRegistros(3, "diario");
  assert.match(consulta.sql, /mi\.tipo = 'produccion' AND mi\.usuario_id = \?/);
  assert.equal(consulta.params[0], 3);
  assert.deepEqual(resultado.resumen, { registros: 2, unidades: 50, ordenes: 1 });
  await assert.rejects(productionService.misRegistros(3, "quincenal"), /periodo/);
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
