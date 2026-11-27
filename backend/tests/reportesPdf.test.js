const test = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../src/config/database");
const { pdfDetalle } = require("../src/services/reportesPdf.service");

function simularVentas(t, filas) {
  const originalQuery = pool.query;
  pool.query = async (sql) => {
    if (sql.includes("AS numero, v.fecha")) return [filas, []];
    if (sql.includes("COUNT(*) AS numero_ventas")) return [[{ numero_ventas: filas.length, unidades: "750.00", total_vendido: "92000.00" }], []];
    if (sql.includes("GROUP BY d.producto")) return [[{ producto: "Cargadera · T20 · calibre 2 · Blanco", unidades: "500.00", total: "60000.00" }], []];
    return [[], []];
  };
  t.after(() => {
    pool.query = originalQuery;
  });
}

const venta = (n) => ({ id: n, venta_id: n, numero: `V-${String(n).padStart(6, "0")}`, fecha: new Date(2026, 9, 27, 10, 30), cliente: `Cliente ${n}`, producto: "Cargadera · T20 · calibre 2 · Blanco", cantidad: "500.00", precio_unitario: "120.00", total: "60000.00" });
const paginas = (pdf) => (pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length;

test("el reporte de ventas en PDF es un documento PDF con su título y nombre de archivo (RF-028)", async (t) => {
  simularVentas(t, [venta(2), venta(1)]);
  const { buffer, nombreArchivo } = await pdfDetalle("ventas", "mensual", new Date(2026, 9, 27), { comprimir: false });
  const texto = buffer.toString("latin1");
  assert.equal(nombreArchivo, "reporte-ventas-mensual-2026-10-01.pdf");
  assert.ok(texto.startsWith("%PDF-"));
  assert.match(texto, /Reporte de ventas mensual/);
  assert.equal(paginas(buffer), 1);
});

test("un reporte largo sigue en varias páginas", async (t) => {
  simularVentas(t, Array.from({ length: 60 }, (_, i) => venta(i + 1)));
  const { buffer } = await pdfDetalle("ventas", "anual", new Date(2026, 9, 27), { comprimir: false });
  assert.ok(paginas(buffer) >= 3);
});

test("el reporte en PDF rechaza un periodo o un tipo inválidos", async () => {
  await assert.rejects(pdfDetalle("ventas", "quincenal"), /El periodo/);
  await assert.rejects(pdfDetalle("inventario", "mensual"), /producción, ventas o rendimiento/);
});
