const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");
const { pool } = require("../src/config/database");
const { libroDetalle } = require("../src/services/reportesExcel.service");

function simularVentas(t) {
  const originalQuery = pool.query;
  pool.query = async (sql) => {
    if (sql.includes("AS numero, v.fecha")) {
      return [[
        { id: 2, venta_id: 2, numero: "V-000002", fecha: new Date(2026, 9, 27, 10, 30), cliente: "Tienda Uno", producto: "Cargadera", cantidad: "500.00", precio_unitario: "120.00", total: "60000.00" },
        { id: 1, venta_id: 1, numero: "V-000001", fecha: new Date(2026, 9, 26, 9, 0), cliente: "=1+1", producto: "Adhesivo PP", cantidad: "250.00", precio_unitario: "128.00", total: "32000.00" },
      ], []];
    }
    if (sql.includes("COUNT(*) AS numero_ventas")) return [[{ numero_ventas: 2, unidades: "750.00", total_vendido: "92000.00" }], []];
    if (sql.includes("GROUP BY d.producto")) return [[{ producto: "Cargadera", unidades: "500.00", total: "60000.00" }, { producto: "Adhesivo PP", unidades: "250.00", total: "32000.00" }], []];
    return [[], []];
  };
  t.after(() => {
    pool.query = originalQuery;
  });
}

async function leer(buffer) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer);
  return libro;
}

test("el Excel de ventas trae resumen, totales por producto y detalle con números y formatos", async (t) => {
  simularVentas(t);
  const { buffer, nombreArchivo } = await libroDetalle("ventas", "mensual", new Date(2026, 9, 27));
  assert.equal(nombreArchivo, "reporte-ventas-mensual-2026-10-01.xlsx");

  const libro = await leer(buffer);
  assert.deepEqual(libro.worksheets.map((h) => h.name), ["Resumen", "Por producto", "Detalle"]);

  const resumen = libro.getWorksheet("Resumen");
  assert.equal(resumen.getCell("A1").value, "Reporte de ventas mensual");
  assert.equal(resumen.getCell("B2").value, "2026-10-01");
  assert.equal(resumen.getCell("B3").value, "2026-10-31");
  assert.equal(resumen.getCell("B8").value, 92000);

  const detalle = libro.getWorksheet("Detalle");
  assert.deepEqual(detalle.getRow(1).values.slice(1), ["Fecha", "Venta", "Cliente", "Producto", "Cantidad", "Precio unitario", "Total"]);
  assert.equal(detalle.getCell("B2").value, "V-000002", "cada línea dice a qué venta pertenece (CR-022)");
  assert.equal(detalle.getCell("G2").value, 60000, "los DECIMAL de MySQL se exportan como número");
  assert.equal(detalle.getCell("G2").numFmt, '"$" #,##0');
  const fecha = detalle.getCell("A2").value;
  assert.ok(fecha instanceof Date);
  assert.deepEqual([fecha.getUTCDate(), fecha.getUTCHours(), fecha.getUTCMinutes()], [27, 10, 30], "Excel muestra la hora local de la venta, no la UTC");
  assert.equal(detalle.getCell("C3").value, "=1+1", "un texto que empieza por = se guarda como texto, no como fórmula");
  assert.equal(detalle.getCell("C3").formula, undefined);
});

test("el Excel rechaza un periodo inválido", async () => {
  await assert.rejects(libroDetalle("ventas", "quincenal"), /El periodo/);
});

test("HU-022: el Excel de rendimiento trae el resumen y una fila por operario", async (t) => {
  const originalQuery = pool.query;
  pool.query = async (sql) => {
    if (sql.includes("FROM usuarios u")) {
      return [[
        { id: 3, nombre: "Operario", ordenes: 2, finalizadas: 1, meta: "1000.00", producido: "750.00" },
        { id: 9, nombre: "Nuevo", ordenes: 0, finalizadas: 0, meta: 0, producido: 0 },
      ], []];
    }
    return [[{ usuario_id: 3, unidades: "400.00" }], []];
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const { buffer, nombreArchivo } = await libroDetalle("rendimiento", "mensual", new Date(2026, 10, 8));
  assert.equal(nombreArchivo, "reporte-rendimiento-mensual-2026-11-01.xlsx");
  const libro = await leer(buffer);
  assert.deepEqual(libro.worksheets.map((h) => h.name), ["Resumen", "Por operario"]);
  const resumen = libro.getWorksheet("Resumen");
  assert.equal(resumen.getCell("A1").value, "Reporte de rendimiento mensual");
  assert.equal(resumen.getCell("B10").value, 75, "cumplimiento total en %");
  const hoja = libro.getWorksheet("Por operario");
  assert.deepEqual(hoja.getRow(1).values.slice(1), ["Operario", "Órdenes", "Finalizadas", "Meta", "Producido", "Cumplimiento (%)", "Unidades registradas en el periodo"]);
  assert.deepEqual(hoja.getRow(2).values.slice(1), ["Operario", 2, 1, 1000, 750, 75, 400]);
  assert.equal(hoja.getCell("F3").value, null, "sin órdenes no hay porcentaje");
});
