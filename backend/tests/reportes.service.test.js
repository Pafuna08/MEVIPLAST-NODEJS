const test = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../src/config/database");
const reportesService = require("../src/services/reportes.service");

test("limitesPeriodo calcula rangos calendario completos", () => {
  const fecha = new Date(2026, 9, 22, 14, 30);

  assert.deepEqual(reportesService.limitesPeriodo("diario", fecha), {
    desde: "2026-10-22",
    hasta: "2026-10-23",
    hastaInclusivo: "2026-10-22",
  });
  assert.deepEqual(reportesService.limitesPeriodo("semanal", fecha), {
    desde: "2026-10-19",
    hasta: "2026-10-26",
    hastaInclusivo: "2026-10-25",
  });
  assert.deepEqual(reportesService.limitesPeriodo("mensual", fecha), {
    desde: "2026-10-01",
    hasta: "2026-11-01",
    hastaInclusivo: "2026-10-31",
  });
  assert.deepEqual(reportesService.limitesPeriodo("anual", fecha), {
    desde: "2026-01-01",
    hasta: "2027-01-01",
    hastaInclusivo: "2026-12-31",
  });
});

test("limitesPeriodo rechaza periodos desconocidos", () => {
  assert.throws(
    () => reportesService.limitesPeriodo("todo"),
    /diario, semanal, mensual o anual/,
  );
});

test("detalleVentas filtra los registros por el rango seleccionado", async (t) => {
  const originalQuery = pool.query;
  const queries = [];
  pool.query = async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes("COUNT(*) AS numero_ventas")) {
      return [[{ numero_ventas: 2, unidades: 5, total_vendido: 12000 }]];
    }
    if (sql.includes("GROUP BY producto")) {
      return [[{ producto: "Bolsa", unidades: 5, total: 12000 }]];
    }
    return [[{ id: 1, cliente: "Cliente", producto: "Bolsa", cantidad: 5 }]];
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const reporte = await reportesService.detalleVentas(
    "mensual",
    new Date(2026, 9, 22),
  );
  assert.equal(reporte.desde, "2026-10-01");
  assert.equal(reporte.hasta, "2026-11-01");
  assert.equal(reporte.resumen.numero_ventas, 2);
  assert.equal(reporte.detalle.length, 1);
  assert.equal(queries.length, 3);
  for (const query of queries) {
    assert.deepEqual(query.params, ["2026-10-01", "2026-11-01"]);
  }
});

test("la bitácora limita los registros entre 1 y 1 000 y ordena del más reciente al más antiguo", async (t) => {
  const originalQuery = pool.query;
  const llamadas = [];
  pool.query = async (sql, params) => {
    llamadas.push({ sql, params });
    return [[], []];
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  for (const limite of [50, 5000, 0, -3, "abc", undefined]) await reportesService.bitacoraAuditoria(limite);
  assert.deepEqual(llamadas.map((l) => l.params[0]), [50, 1000, 100, 1, 100, 100]);
  assert.match(llamadas[0].sql, /ORDER BY a\.fecha DESC, a\.id DESC/);
});

test("HU-022: calcularCumplimiento da el % de la meta por operario y en total", () => {
  const { resumen, operarios } = reportesService.calcularCumplimiento(
    [
      { id: 3, nombre: "Operario", ordenes: 2, finalizadas: "1", meta: "1000.00", producido: "750.00" },
      { id: 7, nombre: "Ana", ordenes: 1, finalizadas: 0, meta: "300.00", producido: "300.00" },
      { id: 9, nombre: "Sin órdenes", ordenes: 0, finalizadas: 0, meta: 0, producido: 0 },
    ],
    new Map([[3, 400], [7, 120]]),
  );
  assert.deepEqual(operarios.map((o) => [o.nombre, o.cumplimiento]), [
    ["Ana", 100],
    ["Operario", 75],
    ["Sin órdenes", null],
  ], "de mayor a menor cumplimiento; sin meta no hay porcentaje");
  assert.equal(operarios[1].finalizadas, 1);
  assert.equal(operarios[1].unidades_periodo, 400);
  assert.equal(operarios[2].unidades_periodo, 0);
  assert.deepEqual(resumen, {
    operarios: 3,
    con_ordenes: 2,
    ordenes: 3,
    meta: 1300,
    producido: 1050,
    cumplimiento: 80.8,
    unidades_periodo: 520,
  });
  assert.equal(reportesService.calcularCumplimiento([]).resumen.cumplimiento, null);
});

test("HU-022: rendimientoOperarios consulta las órdenes del periodo sin las canceladas", async (t) => {
  const originalQuery = pool.query;
  const queries = [];
  pool.query = async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes("FROM usuarios u")) {
      return [[{ id: 3, nombre: "Operario", ordenes: 1, finalizadas: 0, meta: "500.00", producido: "125.00" }]];
    }
    return [[{ usuario_id: 3, unidades: "125.00" }]];
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const reporte = await reportesService.rendimientoOperarios("semanal", new Date(2026, 10, 8));
  assert.equal(reporte.desde, "2026-11-02");
  assert.equal(reporte.hasta, "2026-11-09");
  assert.equal(reporte.operarios[0].cumplimiento, 25);
  assert.equal(reporte.operarios[0].unidades_periodo, 125);
  assert.match(queries[0].sql, /estado <> 'cancelado'/);
  assert.match(queries[0].sql, /LEAST\(p\.cantidad_producida, p\.cantidad\)/, "lo producido no supera la meta");
  assert.match(queries[0].sql, /u\.rol = 'operario' AND u\.activo = 1/);
  for (const query of queries) assert.deepEqual(query.params, ["2026-11-02", "2026-11-09"]);
  await assert.rejects(reportesService.rendimientoOperarios("quincenal"), /El periodo/);
});
