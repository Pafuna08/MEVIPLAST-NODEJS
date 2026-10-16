const test = require('node:test');
const assert = require('node:assert/strict');

const { sanitizarTexto, sanitizarNumero, sanitizarObjeto } = require('../src/utils/sanitizar');

test('sanitizarTexto elimina HTML y espacios peligrosos', () => {
  assert.equal(sanitizarTexto('<script>alert(1)</script>  Bolsa  azul'), 'alert(1) Bolsa azul');
});

test('sanitizarNumero valida solo valores numericos positivos', () => {
  assert.equal(sanitizarNumero('12.5'), 12.5);
  assert.equal(sanitizarNumero('-4'), 0);
  assert.equal(sanitizarNumero('abc'), 0);
});

test('sanitizarObjeto limpia strings y guarda ints en numeros', () => {
  const entrada = { producto: '<b>Bolsa</b> azul', cantidad: '20', descripcion: 'texto <script>x</script>' };
  const salida = sanitizarObjeto(entrada);

  assert.equal(salida.producto, 'Bolsa azul');
  assert.equal(salida.cantidad, 20);
  assert.equal(salida.descripcion, 'texto x');
});
