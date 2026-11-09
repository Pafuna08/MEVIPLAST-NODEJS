const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizarMedida, normalizarCalibre, normalizarColor } = require("../src/utils/variantes");
const inventarioService = require("../src/services/inventario.service");
const materiaPrimaService = require("../src/services/materiaPrima.service");
const productionService = require("../src/services/produccion.service");

const rechazo = (patron) => (error) => error.statusCode === 400 && patron.test(error.message);

test("RN-025: la medida se normaliza a «ancho x largo» con unidad opcional", () => {
  assert.equal(normalizarMedida("10 x 15"), "10 x 15");
  assert.equal(normalizarMedida("10x15"), "10 x 15");
  assert.equal(normalizarMedida(" 10 X 15 "), "10 x 15");
  assert.equal(normalizarMedida("6*12"), "6 x 12");
  assert.equal(normalizarMedida("40x60 CM"), "40 x 60 cm");
  assert.equal(normalizarMedida("12,5 × 18"), "12.5 x 18");
});

test("RN-025: la medida rechaza texto, ceros y formatos incompletos", () => {
  for (const valor of ["eddc", "10", "10 x", "x 15", "0 x 15", "10 x 15 metros", "10 x 15 x 20", "", undefined]) {
    assert.throws(() => normalizarMedida(valor), rechazo(/ancho x largo/), `debió rechazar ${valor}`);
  }
});

test("RN-025: el calibre es un número mayor que cero con hasta 2 decimales", () => {
  assert.equal(normalizarCalibre("0.95"), "0.95");
  assert.equal(normalizarCalibre("0,95"), "0.95");
  assert.equal(normalizarCalibre("2"), "2");
  assert.equal(normalizarCalibre("1.50"), "1.5");
  for (const valor of ["eew", "0", "-1", "1.234", "2 mm", ""]) {
    assert.throws(() => normalizarCalibre(valor), rechazo(/calibre/), `debió rechazar ${valor}`);
  }
});

test("RN-025: el color solo admite letras y espacios y se guarda con mayúscula inicial", () => {
  assert.equal(normalizarColor("transparente"), "Transparente");
  assert.equal(normalizarColor("  BLANCO   hueso "), "Blanco hueso");
  assert.equal(normalizarColor("ámbar"), "Ámbar");
  for (const valor of ["essd123", "Az", "Rojo!", "Negro-mate", "x".repeat(41), ""]) {
    assert.throws(() => normalizarColor(valor), rechazo(/color/), `debió rechazar ${valor}`);
  }
});

test("RN-025: el ingreso de inventario rechaza una medida inválida antes de tocar la base", async () => {
  await assert.rejects(
    inventarioService.ingresar({ familia: "Adhesivo Seguridad", medida: "eddc", calibre: "eew", color: "Transparente", cantidad: 233 }, 4),
    rechazo(/ancho x largo/),
  );
});

test("RN-025: la orden de producción y la bobina usan la misma regla", async () => {
  await assert.rejects(
    productionService.crear({ producto: "Cargadera", cantidad: 10, medida: "40 x 60", calibre: "dos", color: "Negro" }, { id: 1, rol: "admin" }),
    rechazo(/calibre/),
  );
  await assert.rejects(
    materiaPrimaService.crear({ tipo: "PEBD", medida: "grande", calibre: "1", color: "Natural", peso_rollo: 20 }, 1),
    rechazo(/ancho x largo/),
  );
});
