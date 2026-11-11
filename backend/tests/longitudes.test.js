const test = require("node:test");
const assert = require("node:assert/strict");
const { validarLongitudes, LIMITES } = require("../src/middlewares/longitudes.middleware");
const inventarioService = require("../src/services/inventario.service");

function llamar(body) {
  const respuesta = { codigo: null, cuerpo: null };
  let siguio = false;
  const res = {
    status(codigo) {
      respuesta.codigo = codigo;
      return this;
    },
    json(cuerpo) {
      respuesta.cuerpo = cuerpo;
      return this;
    },
  };
  validarLongitudes({ body }, res, () => {
    siguio = true;
  });
  return { ...respuesta, siguio };
}

test("un texto más largo que su columna se rechaza con 400 y el resto pasa", () => {
  const rechazo = llamar({ cliente: "x".repeat(LIMITES.cliente + 1) });
  assert.equal(rechazo.codigo, 400);
  assert.equal(rechazo.siguio, false);
  assert.match(rechazo.cuerpo.mensaje, /«cliente» admite máximo 120 caracteres/);

  const valido = llamar({ cliente: "x".repeat(LIMITES.cliente), cantidad: 5 });
  assert.equal(valido.codigo, null);
  assert.equal(valido.siguio, true);
});

test("la variante de inventario y producción respeta el largo de sus columnas", () => {
  assert.throws(
    () => inventarioService.validarVariante({ familia: "Sencilla PP", medida: "x".repeat(41), calibre: "2", color: "Negro" }),
    (error) => error.statusCode === 400 && /medida admite máximo 40/.test(error.message),
  );
  assert.equal(
    inventarioService.validarVariante({ familia: "Sencilla PP", medida: "15 x 20", calibre: "2", color: "Negro" }).producto,
    "Sencilla PP · 15 x 20 · calibre 2 · Negro",
  );
});
