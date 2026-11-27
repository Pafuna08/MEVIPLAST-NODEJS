const test = require("node:test");
const assert = require("node:assert/strict");

const { pool } = require("../src/config/database");
const reportesService = require("../src/services/reportes.service");

function simularConsultas(t, respuestas = () => [[], []]) {
  const original = pool.query;
  const consultas = [];
  pool.query = async (sql, valores) => {
    consultas.push({ sql, valores });
    return respuestas(sql);
  };
  t.after(() => { pool.query = original; });
  return consultas;
}

// HU-004 / RF-024: historial de producción filtrado por operario y producto
test("el detalle de producción filtra por operario y por producto con valores enlazados", async (t) => {
  const consultas = simularConsultas(t, (sql) => {
    if (sql.includes("COUNT(*)")) return [[{ movimientos: 1, unidades: 40 }], []];
    if (sql.includes("DISTINCT u.id")) return [[{ id: 7, nombre: "Laura Martínez" }], []];
    if (sql.includes("DISTINCT i.producto")) return [[{ producto: "Sencilla PP · 10 x 15 · calibre 1 · Transparente" }], []];
    return [[], []];
  });
  const datos = await reportesService.detalleProduccion("mensual", new Date(2026, 10, 24), {
    operario_id: "7",
    producto: "Sencilla PP · 10 x 15 · calibre 1 · Transparente",
  });
  const detalle = consultas[0];
  assert.match(detalle.sql, /mi\.usuario_id = \?/);
  assert.match(detalle.sql, /i\.producto = \?/);
  assert.deepEqual(detalle.valores, ["2026-11-01", "2026-12-01", 7, "Sencilla PP · 10 x 15 · calibre 1 · Transparente"]);
  assert.deepEqual(datos.filtros, { operario_id: 7, operario: "Laura Martínez", producto: "Sencilla PP · 10 x 15 · calibre 1 · Transparente" });
  assert.equal(datos.opciones.operarios.length, 1);
  assert.equal(datos.opciones.productos.length, 1);
});

test("sin filtros el detalle de producción no agrega condiciones", async (t) => {
  const consultas = simularConsultas(t, (sql) => (sql.includes("COUNT(*)") ? [[{ movimientos: 0, unidades: 0 }], []] : [[], []]));
  const datos = await reportesService.detalleProduccion("diario", new Date(2026, 10, 24));
  assert.doesNotMatch(consultas[0].sql, /usuario_id = \?|producto = \?/);
  assert.equal(datos.filtros.operario_id, null);
  assert.equal(datos.filtros.producto, null);
});

test("un filtro de operario inválido responde 400", async (t) => {
  simularConsultas(t);
  await assert.rejects(reportesService.detalleProduccion("diario", new Date(), { operario_id: "abc" }), { statusCode: 400 });
  await assert.rejects(reportesService.detalleProduccion("diario", new Date(), { operario_id: "-3" }), { statusCode: 400 });
});

// HU-023 / RF-026: el reporte de inventario incluye las materias primas
test("el reporte de inventario trae producto terminado y materias primas con su alerta de stock", async (t) => {
  simularConsultas(t, (sql) => (sql.includes("FROM materia_prima")
    ? [[{ nombre: "Bobina PEBD", cantidad: 8, unidad: "kg", stock_minimo: 50, bajo_stock: 1 }], []]
    : [[{ producto: "Cargadera · T20 · calibre 2 · Blanco", cantidad: 250 }], []]));
  const reporte = await reportesService.resumenInventario();
  assert.equal(reporte.productos.length, 1);
  assert.deepEqual(reporte.materias_primas, [{ nombre: "Bobina PEBD", cantidad: 8, unidad: "kg", stock_minimo: 50, bajo_stock: true }]);
});
