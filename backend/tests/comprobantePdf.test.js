const test = require("node:test");
const assert = require("node:assert/strict");
const { generarComprobantePdf } = require("../src/services/comprobantePdf.service");

const linea = (n) => ({ id: n, producto: `Producto ${n}`, familia: "Cargadera", medida: "T20", calibre: "2", color: "Blanco", cantidad: 100, cantidad_paquetes: 1, unidades_paquete: 100, precio_paquete: 9000, total: 9000 });
const venta = (items) => ({ id: 9, numero: "V-000009", fecha: new Date(2026, 10, 11, 2, 20), cliente: "Antonio", vendedor: "Administrador", total: 9000 * items.length, items });
const paginas = (pdf) => (pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length;

test("el comprobante en PDF es un documento PDF con sus datos y una página para pocas líneas", async () => {
  const pdf = await generarComprobantePdf(venta([linea(1), linea(2)]), { comprimir: false });
  const texto = pdf.toString("latin1");
  assert.ok(texto.startsWith("%PDF-"), "empieza como PDF");
  assert.match(texto, /%%EOF\s*$/, "termina como PDF");
  assert.match(texto, /Comprobante de venta V-000009/, "el título del documento lleva el número");
  assert.equal(paginas(pdf), 1);
});

test("con muchas líneas el comprobante sigue en otra página", async () => {
  const pdf = await generarComprobantePdf(venta(Array.from({ length: 20 }, (_, i) => linea(i + 1))), { comprimir: false });
  assert.ok(paginas(pdf) >= 2);
});
