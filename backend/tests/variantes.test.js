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

test("RN-025: el color debe ser de la lista fija y se guarda con el nombre de la lista", () => {
  assert.equal(normalizarColor("transparente"), "Transparente");
  assert.equal(normalizarColor("  NEGRO "), "Negro");
  assert.equal(normalizarColor("cafe"), "Café");
  for (const valor of ["Fdsa", "Gtf", "Fres", "essd", "Blanco hueso", "Ámbar", "essd123", "Rojo!", "x".repeat(41), ""]) {
    assert.throws(() => normalizarColor(valor), rechazo(/color/), `debió rechazar ${valor}`);
  }
});

test("RN-025: el ingreso de inventario rechaza una medida inválida antes de tocar la base", async () => {
  await assert.rejects(
    inventarioService.ingresar({ familia: "Adhesivo Seguridad", medida: "eddc", calibre: "eew", color: "Transparente", cantidad: 233 }, 4),
    rechazo(/ancho x largo/),
  );
});

test("RN-026: la orden de producción exige una materia prima existente", async (t) => {
  const { pool } = require("../src/config/database");
  const original = pool.query;
  pool.query = async (sql, params = []) => (sql.startsWith("SELECT id FROM materia_prima") ? [Number(params[0]) === 4 ? [{ id: 4 }] : []] : [[], []]);
  t.after(() => { pool.query = original; });
  const orden = { producto: "Sencilla PP", cantidad: 10, medida: "40 x 60", calibre: "2", color: "Negro" };
  for (const materia of [undefined, "", 0, null]) {
    await assert.rejects(productionService.crear({ ...orden, materia_prima_id: materia }, { id: 1, rol: "admin" }), rechazo(/Selecciona la materia prima/));
  }
  await assert.rejects(productionService.crear({ ...orden, materia_prima_id: 99 }, { id: 1, rol: "admin" }), rechazo(/Materia prima no encontrada/));
});

test("RN-025: la orden de producción y la bobina usan la misma regla", async () => {
  await assert.rejects(
    productionService.crear({ producto: "Sencilla PP", cantidad: 10, medida: "40 x 60", calibre: "dos", color: "Negro" }, { id: 1, rol: "admin" }),
    rechazo(/calibre/),
  );
  await assert.rejects(
    materiaPrimaService.crear({ tipo: "PEBD", medida: "grande", calibre: "1", color: "Natural", peso_rollo: 20 }, 1),
    rechazo(/ancho x largo/),
  );
});

test("Cargadera usa tallas T15, T20, T25 y T30; las demás líneas, ancho x largo (CR-019)", () => {
  const { validarVariante } = require("../src/services/inventario.service");
  const cargadera = (medida) => validarVariante({ familia: "Cargadera", medida, calibre: "2", color: "Blanco" });
  assert.equal(cargadera("T15").medida, "T15");
  assert.equal(cargadera(" t20 ").medida, "T20");
  assert.equal(cargadera("T 25").producto, "Cargadera · T25 · calibre 2 · Blanco");
  for (const medida of ["15 x 20", "T35", "T", "20"]) {
    assert.throws(() => cargadera(medida), { statusCode: 400, message: /Cargadera debe ser T15, T20, T25 o T30/ }, medida);
  }
  assert.throws(() => validarVariante({ familia: "Sencilla PP", medida: "T15", calibre: "2", color: "Blanco" }), /ancho x largo/);
  assert.equal(validarVariante({ familia: "Sencilla PP", medida: "6x9", calibre: "1", color: "Natural" }).medida, "6 x 9");
});
