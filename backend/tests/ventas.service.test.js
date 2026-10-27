const test = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../src/config/database");
const salesService = require("../src/services/ventas.service");

test("registrar venta rechaza paquetes superiores a 500 unidades", async () => {
  await assert.rejects(
    salesService.registrar(
      {
        cliente: "Cliente de prueba",
        inventario_id: 22,
        cantidad_paquetes: 1,
        unidades_paquete: 501,
        precio_paquete: 7000,
      },
      3,
    ),
    /entre 1 y 500 unidades/,
  );
});

test("registrar venta descuenta unidades equivalentes a paquetes y guarda el precio por paquete", async (t) => {
  const originalGetConnection = pool.getConnection;
  const originalQuery = pool.query;
  const statements = [];
  let committed = false;
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {
      committed = true;
    },
    rollback: async () => assert.fail("No debe revertirse una venta con stock"),
    release: () => {},
    query: async (sql, params = []) => {
      statements.push({ sql, params });
      if (sql.startsWith("SELECT id, producto, familia")) {
        return [[{
          id: 22,
          producto: "Sencilla PP · 6*12 · calibre 2 · Transparente",
          familia: "Sencilla PP",
          cantidad: 1200,
        }]];
      }
      if (sql.startsWith("INSERT INTO ventas")) return [{ insertId: 15 }, []];
      return [[], []];
    },
  });
  pool.query = async (sql) => {
    if (sql.startsWith("SELECT * FROM ventas")) return [[{ id: 15 }]];
    return [{ insertId: 1 }, []];
  };
  t.after(() => {
    pool.getConnection = originalGetConnection;
    pool.query = originalQuery;
  });

  await salesService.registrar(
    {
      cliente: "Cliente de prueba",
      inventario_id: 22,
      cantidad_paquetes: 10,
      unidades_paquete: 100,
      precio_paquete: 7000,
    },
    3,
  );

  assert.equal(committed, true);
  const insert = statements.find(({ sql }) => sql.startsWith("INSERT INTO ventas"));
  assert.deepEqual(insert.params, [
    "Cliente de prueba",
    "Sencilla PP · 6*12 · calibre 2 · Transparente",
    1000,
    70,
    22,
    10,
    100,
    7000,
    3,
  ]);
  const stockUpdate = statements.find(({ sql }) => sql.startsWith("UPDATE inventario"));
  assert.deepEqual(stockUpdate.params, [1000, 22, 1000]);
  const movement = statements.find(({ sql }) =>
    sql.startsWith("INSERT INTO movimientos_inventario"),
  );
  assert.deepEqual(movement.params, [22, 3, 15, 1000]);
});

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

test("el comprobante del vendedor se limita a sus ventas y lleva número consecutivo", async (t) => {
  const originalQuery = pool.query;
  let query;
  pool.query = async (sql, params) => {
    query = { sql, params };
    return [[{ id: 15, cliente: "Cliente de prueba", total: 70000 }], []];
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const comprobante = await salesService.obtenerComprobante(15, { id: 12, rol: "vendedor" });
  assert.match(query.sql, /WHERE v\.id = \? AND v\.usuario_id = \?/);
  assert.deepEqual(query.params, [15, 12]);
  assert.equal(comprobante.numero, "V-000015");
});

test("el administrador consulta el comprobante de cualquier venta", async (t) => {
  const originalQuery = pool.query;
  let query;
  pool.query = async (sql, params) => {
    query = { sql, params };
    return [[], []];
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  assert.equal(await salesService.obtenerComprobante(99, { id: 1, rol: "admin" }), null);
  assert.doesNotMatch(query.sql, /usuario_id = \?/);
  assert.deepEqual(query.params, [99]);
});
