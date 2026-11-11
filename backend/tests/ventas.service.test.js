const test = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../src/config/database");
const salesService = require("../src/services/ventas.service");

const VARIANTES = {
  22: { id: 22, producto: "Sencilla PP · 6 x 12 · calibre 2 · Transparente", familia: "Sencilla PP", cantidad: 1200 },
  31: { id: 31, producto: "Cargadera · T20 · calibre 2 · Blanco", familia: "Cargadera", cantidad: 300 },
};

// Conexión simulada: guarda cada sentencia y responde el inventario de VARIANTES
function simularVenta(t, { stock = VARIANTES } = {}) {
  const originalGetConnection = pool.getConnection;
  const originalQuery = pool.query;
  const estado = { statements: [], committed: false, rolledBack: false };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => { estado.committed = true; },
    rollback: async () => { estado.rolledBack = true; },
    release: () => {},
    query: async (sql, params = []) => {
      estado.statements.push({ sql, params });
      if (sql.startsWith("SELECT id, producto, familia, cantidad FROM inventario")) {
        return [params[0].map((id) => stock[id]).filter(Boolean)];
      }
      if (sql.startsWith("INSERT INTO ventas ")) return [{ insertId: 15 }, []];
      return [[], []];
    },
  });
  pool.query = async (sql) => {
    if (sql.includes("FROM ventas v")) return [[{ id: 15, cliente: "Cliente de prueba", total: 70000 }]];
    return [[], []];
  };
  t.after(() => {
    pool.getConnection = originalGetConnection;
    pool.query = originalQuery;
  });
  return estado;
}

const linea = (inventario_id, extra = {}) => ({ inventario_id, cantidad_paquetes: 10, unidades_paquete: 100, precio_paquete: 7000, ...extra });

test("registrar venta solo acepta paquetes de 50, 100 o 500 unidades (CR-018)", async () => {
  await assert.rejects(
    salesService.registrar({ cliente: "Cliente de prueba", ...linea(22, { unidades_paquete: 501 }) }, 3),
    /50, 100 o 500 unidades/,
  );
});

test("registrar venta descuenta unidades equivalentes a paquetes y guarda el precio por paquete (formato anterior)", async (t) => {
  const estado = simularVenta(t);
  await salesService.registrar({ cliente: "Cliente de prueba", ...linea(22) }, 3);

  assert.equal(estado.committed, true);
  const encabezado = estado.statements.find(({ sql }) => sql.startsWith("INSERT INTO ventas "));
  assert.deepEqual(encabezado.params, ["Cliente de prueba", 70000, 3]);
  const detalle = estado.statements.find(({ sql }) => sql.startsWith("INSERT INTO ventas_detalle"));
  assert.deepEqual(detalle.params, [15, 22, "Sencilla PP · 6 x 12 · calibre 2 · Transparente", 1000, 70, 10, 100, 7000]);
  const stockUpdate = estado.statements.find(({ sql }) => sql.startsWith("UPDATE inventario"));
  assert.deepEqual(stockUpdate.params, [1000, 22, 1000]);
  const movement = estado.statements.find(({ sql }) => sql.startsWith("INSERT INTO movimientos_inventario"));
  assert.deepEqual(movement.params, [22, 3, 15, 1000]);
});

test("CR-022: una venta con varios productos guarda una línea, un descuento y un movimiento por producto", async (t) => {
  const estado = simularVenta(t);
  await salesService.registrar({
    cliente: "Cliente de prueba",
    items: [linea(31, { cantidad_paquetes: 2, unidades_paquete: 50, precio_paquete: 4500 }), linea(22)],
  }, 3);

  assert.equal(estado.committed, true);
  const bloqueo = estado.statements.find(({ sql }) => sql.includes("FOR UPDATE"));
  assert.deepEqual(bloqueo.params, [[22, 31]], "las variantes se bloquean siempre en el mismo orden");
  const encabezado = estado.statements.find(({ sql }) => sql.startsWith("INSERT INTO ventas "));
  assert.deepEqual(encabezado.params, ["Cliente de prueba", 79000, 3], "el total es la suma de las líneas");
  const lineas = estado.statements.filter(({ sql }) => sql.startsWith("INSERT INTO ventas_detalle")).map(({ params }) => params.slice(1, 4));
  assert.deepEqual(lineas, [[31, "Cargadera · T20 · calibre 2 · Blanco", 100], [22, "Sencilla PP · 6 x 12 · calibre 2 · Transparente", 1000]]);
  assert.equal(estado.statements.filter(({ sql }) => sql.startsWith("UPDATE inventario")).length, 2);
  assert.equal(estado.statements.filter(({ sql }) => sql.startsWith("INSERT INTO movimientos_inventario")).length, 2);
});

test("CR-022: si a un producto le falta stock no se guarda ninguna línea", async (t) => {
  const estado = simularVenta(t);
  await assert.rejects(
    salesService.registrar({ cliente: "Cliente de prueba", items: [linea(22), linea(31, { cantidad_paquetes: 4 })] }, 3),
    { statusCode: 400, message: /Producto 2: stock insuficiente de Cargadera · T20 · calibre 2 · Blanco \(hay 300 unidades\)/ },
  );
  assert.equal(estado.rolledBack, true);
  assert.equal(estado.committed, false);
  assert.equal(estado.statements.some(({ sql }) => sql.startsWith("INSERT")), false);
});

test("CR-022: reglas de la venta antes de tocar la base", async () => {
  const venta = (datos) => salesService.registrar({ cliente: "Cliente", ...datos }, 3);
  await assert.rejects(salesService.registrar({ items: [linea(22)] }, 3), /cliente es obligatorio/);
  await assert.rejects(venta({ items: [] }), /al menos un producto/);
  await assert.rejects(venta({ items: Array.from({ length: 21 }, (_, i) => linea(i + 1)) }), /máximo 20 productos/);
  await assert.rejects(venta({ items: [linea(22), linea(22)] }), /Producto 2: esa referencia ya está en la venta/);
  await assert.rejects(venta({ items: [linea(22), linea(31, { unidades_paquete: 60 })] }), /Producto 2: El paquete debe ser de 50, 100 o 500/);
  await assert.rejects(venta({ items: [linea(22), linea("abc")] }), /Producto 2: Selecciona una variante/);
  // $100.000.000 es el tope del total de la venta, no de cada línea
  await assert.rejects(
    venta({ items: [linea(22, { cantidad_paquetes: 1000, precio_paquete: 60000 }), linea(31, { cantidad_paquetes: 1000, precio_paquete: 60000 })] }),
    /total de la venta admite como máximo \$100\.000\.000/,
  );
});

test("el vendedor solo consulta sus propias ventas", async (t) => {
  const originalQuery = pool.query;
  const queries = [];
  pool.query = async (sql, params) => {
    queries.push({ sql, params });
    return [[], []];
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  assert.deepEqual(await salesService.listar({ id: 12, rol: "vendedor" }), []);
  assert.match(queries[0].sql, /WHERE v\.usuario_id = \?/);
  assert.deepEqual(queries[0].params, [12]);
});

test("el comprobante del vendedor se limita a sus ventas, lleva número consecutivo y todas sus líneas", async (t) => {
  const originalQuery = pool.query;
  const queries = [];
  pool.query = async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes("FROM ventas v")) return [[{ id: 15, cliente: "Cliente de prueba", total: 79000 }], []];
    return [[{ id: 1, venta_id: 15, producto: "A" }, { id: 2, venta_id: 15, producto: "B" }], []];
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const comprobante = await salesService.obtenerComprobante(15, { id: 12, rol: "vendedor" });
  assert.match(queries[0].sql, /WHERE v\.id = \? AND v\.usuario_id = \?/);
  assert.deepEqual(queries[0].params, [15, 12]);
  assert.equal(comprobante.numero, "V-000015");
  assert.deepEqual(comprobante.items.map((item) => item.producto), ["A", "B"]);
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
