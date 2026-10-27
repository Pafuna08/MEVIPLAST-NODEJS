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
