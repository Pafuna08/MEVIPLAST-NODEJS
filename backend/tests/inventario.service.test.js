const test = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../src/config/database");
const inventoryService = require("../src/services/inventario.service");

test("ingresar inventario crea una variante de una línea permitida con sus especificaciones", async (t) => {
  const originalGetConnection = pool.getConnection;
  const originalQuery = pool.query;
  const statements = [];
  let committed = false;
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {
      committed = true;
    },
    rollback: async () => assert.fail("No debe revertirse una variante válida"),
    release: () => {},
    query: async (sql, params = []) => {
      statements.push({ sql, params });
      if (sql.startsWith("SELECT id FROM inventario")) return [[], []];
      if (sql.startsWith("INSERT INTO inventario")) return [{ insertId: 18 }, []];
      return [[], []];
    },
  });
  pool.query = async (sql) => {
    if (sql.startsWith("SELECT * FROM inventario")) {
      return [[{ id: 18, familia: "Adhesivo PP", cantidad: 500 }]];
    }
    return [{ insertId: 1 }, []];
  };
  t.after(() => {
    pool.getConnection = originalGetConnection;
    pool.query = originalQuery;
  });

  await inventoryService.ingresar(
    {
      familia: "Adhesivo PP",
      medida: "6*12",
      calibre: "2",
      color: "Transparente",
      cantidad: 500,
      ubicacion: "Bodega A",
    },
    4,
  );

  assert.equal(committed, true);
  const insert = statements.find(({ sql }) => sql.startsWith("INSERT INTO inventario"));
  assert.deepEqual(insert.params, [
    "Adhesivo PP · 6*12 · calibre 2 · Transparente",
    "Adhesivo PP",
    "6*12",
    "2",
    "Transparente",
    500,
    "Bodega A",
  ]);
  const movement = statements.find(({ sql }) =>
    sql.startsWith("INSERT INTO movimientos_inventario"),
  );
  assert.deepEqual(movement.params, [18, 4, null, "ingreso_manual", 500]);
});

test("ingresar inventario rechaza líneas fuera del catálogo MEVIPLAST", async () => {
  await assert.rejects(
    inventoryService.ingresar(
      {
        familia: "Sello fondo",
        medida: "6*12",
        calibre: "2",
        color: "Transparente",
        cantidad: 500,
      },
      4,
    ),
    { statusCode: 400, message: "Selecciona una línea de producto válida" },
  );
});

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

  const item = await inventoryService.registrarSalida(5, 3, 8, { motivo: "Merma" });
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
  assert.deepEqual(ledger.params, [5, 8, 3, "Merma"]);
});

test("la salida manual exige un motivo válido y detalle cuando es «Otro», sin tocar la base", async (t) => {
  const originalGetConnection = pool.getConnection;
  pool.getConnection = async () => assert.fail("No debe abrir una transacción con un motivo inválido");
  t.after(() => {
    pool.getConnection = originalGetConnection;
  });

  await assert.rejects(inventoryService.registrarSalida(5, 3, 8), /Selecciona el motivo/);
  await assert.rejects(inventoryService.registrarSalida(5, 3, 8, { motivo: "Regalo" }), /Selecciona el motivo/);
  await assert.rejects(inventoryService.registrarSalida(5, 3, 8, { motivo: "Otro", detalle: "  " }), /Describe el motivo/);
  await assert.rejects(inventoryService.registrarSalida(5, 3, 8, { motivo: "Merma", detalle: "x".repeat(201) }), /200 caracteres/);
});

test("el motivo y su detalle quedan en el movimiento y en la auditoría", async (t) => {
  const originalGetConnection = pool.getConnection;
  const originalQuery = pool.query;
  const statements = [];
  const auditoria = [];
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql, params = []) => {
      statements.push({ sql, params });
      if (sql.startsWith("SELECT id, producto")) return [[{ id: 5, producto: "Cargadera", cantidad: 100 }]];
      return [[], []];
    },
  });
  pool.query = async (sql, params = []) => {
    if (sql.startsWith("INSERT INTO auditoria")) auditoria.push(params);
    if (sql.startsWith("SELECT * FROM inventario")) return [[{ id: 5, cantidad: 90 }]];
    return [[], []];
  };
  t.after(() => {
    pool.getConnection = originalGetConnection;
    pool.query = originalQuery;
  });

  await inventoryService.registrarSalida(5, 10, 8, { motivo: "Otro", detalle: "Donación a la feria" });
  const ledger = statements.find(({ sql }) => sql.startsWith("INSERT INTO movimientos_inventario"));
  assert.equal(ledger.params[3], "Otro: Donación a la feria");
  assert.match(auditoria[0][3], /Salida de 10 unidades de 'Cargadera' \(Otro: Donación a la feria\)/);
});
