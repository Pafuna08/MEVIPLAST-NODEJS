const test = require("node:test");
const assert = require("node:assert/strict");

const {
  sanitizarTexto,
  sanitizarNumero,
  sanitizarObjeto,
} = require("../src/utils/sanitizar");

test("sanitizarTexto elimina HTML y contenido de scripts", () => {
  assert.equal(
    sanitizarTexto("<script>alert(1)</script>  Bolsa  azul"),
    "Bolsa azul",
  );
});

test("sanitizarNumero valida solo valores numericos positivos", () => {
  assert.equal(sanitizarNumero("12.5"), 12.5);
  assert.equal(sanitizarNumero("-4"), 0);
  // DEF-022: un texto que no es un número limpio no se convierte (antes «2abc» quedaba en 2)
  assert.equal(sanitizarNumero("abc"), "abc");
  assert.equal(sanitizarNumero("2abc"), "2abc");
  assert.equal(sanitizarNumero("1e5"), "1e5");
});

test("sanitizarObjeto limpia strings y guarda ints en numeros", () => {
  const entrada = {
    producto: "<b>Bolsa</b> azul",
    cantidad: "20",
    descripcion: "texto <script>x</script>",
  };
  const salida = sanitizarObjeto(entrada);

  assert.equal(salida.producto, "Bolsa azul");
  assert.equal(salida.cantidad, 20);
  assert.equal(salida.descripcion, "texto");
});

test("sanitizarObjeto conserva los arreglos de objetos y sanea cada elemento (CR-022)", () => {
  const salida = sanitizarObjeto({
    cliente: "<b>Tienda</b>",
    items: [{ inventario_id: "7", cantidad_paquetes: "2", precio_paquete: "1500" }, { inventario_id: 8, nota: "<i>x</i>" }],
  });
  assert.equal(salida.cliente, "Tienda");
  assert.ok(Array.isArray(salida.items));
  assert.deepEqual(salida.items, [{ inventario_id: 7, cantidad_paquetes: 2, precio_paquete: 1500 }, { inventario_id: 8, nota: "x" }]);
});

test("sanitizarObjeto no convierte en número textos cuya clave contiene «id» o «min»", () => {
  const salida = sanitizarObjeto({
    prioridad: "alta",
    medida: "10 x 15",
    calibre: "2",
    inventario_id: "7",
    unidades_paquete: "500",
    precio_paquete: "30000",
    stock_minimo: "25",
    activo: "1",
  });

  assert.equal(salida.prioridad, "alta");
  assert.equal(salida.medida, "10 x 15");
  assert.equal(salida.calibre, "2");
  assert.equal(salida.inventario_id, 7);
  assert.equal(salida.unidades_paquete, 500);
  assert.equal(salida.precio_paquete, 30000);
  assert.equal(salida.stock_minimo, 25);
  assert.equal(salida.activo, 1);
});
