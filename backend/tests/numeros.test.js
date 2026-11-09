const test = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../src/config/database");
const { LIMITES, entero, decimal, leerNumero } = require("../src/utils/numeros");
const produccionService = require("../src/services/produccion.service");
const inventarioService = require("../src/services/inventario.service");
const materiaPrimaService = require("../src/services/materiaPrima.service");
const ventasService = require("../src/services/ventas.service");

test("leerNumero acepta números y textos numéricos limpios; rechaza «2abc», «1e5» y «0x10»", () => {
  assert.equal(leerNumero(12), 12);
  assert.equal(leerNumero("12.5"), 12.5);
  assert.equal(leerNumero("0,95"), 0.95);
  for (const valor of ["2abc", "1e5", "0x10", "", null, undefined, {}]) assert.ok(Number.isNaN(leerNumero(valor)), String(valor));
});

test("entero: mayor que cero, sin decimales y hasta el tope", () => {
  assert.equal(entero("1000000", "La meta"), LIMITES.UNIDADES_MAX);
  assert.throws(() => entero(10.5, "La meta"), { statusCode: 400, message: "La meta debe ser un número entero mayor que cero" });
  assert.throws(() => entero(1e12, "La meta"), { statusCode: 400, message: "La meta admite como máximo 1.000.000" });
  assert.throws(() => entero("2abc", "La meta"), /entero mayor que cero/);
});

test("decimal: hasta 2 decimales y hasta el tope; cero solo si se permite", () => {
  assert.equal(decimal("0.95", "El peso", LIMITES.KG_MAX), 0.95);
  assert.equal(decimal(0, "El stock mínimo", LIMITES.KG_MAX, { permitirCero: true }), 0);
  assert.throws(() => decimal(1.234, "El peso", LIMITES.KG_MAX), /máximo 2 decimales/);
  assert.throws(() => decimal(100000.01, "El peso", LIMITES.KG_MAX), /máximo 100.000/);
  assert.throws(() => decimal(-3, "El stock mínimo", LIMITES.KG_MAX, { permitirCero: true }), /mayor que o igual a cero/);
});

test("producción rechaza metas y avances con decimales o fuera del tope antes de tocar la base", async () => {
  const variante = { medida: "10 x 15", calibre: "2", color: "Transparente", materia_prima_id: 1 };
  await assert.rejects(produccionService.crearPlantilla({ producto: "Adhesivo PP", cantidad: 3.3, ...variante }, 1), /entero mayor que cero/);
  await assert.rejects(produccionService.crear({ producto: "Adhesivo PP", cantidad: 1e12, ...variante }, { id: 1, rol: "admin" }), /máximo 1.000.000/);
  await assert.rejects(produccionService.registrarAvance(5, { cantidad: 1.5 }, { id: 3, rol: "operario" }), /entero mayor que cero/);
});

test("inventario rechaza ingresos y salidas fuera del tope o con decimales", async () => {
  await assert.rejects(inventarioService.ingresar({ familia: "Cargadera", medida: "15 x 20", calibre: "2", color: "Blanco", cantidad: 1e12 }, 1), /máximo 1.000.000/);
  await assert.rejects(inventarioService.registrarSalida(5, 1.5, 1, { motivo: "Merma" }), /entero mayor que cero/);
});

test("materia prima: tope de kg, stock mínimo válido y una sola bobina por variante", async (t) => {
  const bobina = { tipo: "PEBD", medida: "7 x 9", calibre: "1", color: "Azul" };
  await assert.rejects(materiaPrimaService.crear({ ...bobina, peso_rollo: 1e12 }, 1), /máximo 100.000/);
  await assert.rejects(materiaPrimaService.actualizar(3, { stock_minimo: -3 }, 1), /mayor que o igual a cero/);
  await assert.rejects(materiaPrimaService.registrarMovimiento(3, { tipo: "compra", cantidad: 1e12 }, { id: 1, rol: "admin" }), /máximo 100.000/);

  const originalGetConnection = pool.getConnection;
  let insertado = false;
  let revertido = false;
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => { revertido = true; },
    release: () => {},
    query: async (sql) => {
      if (sql.startsWith("SELECT id FROM materia_prima WHERE tipo")) return [[{ id: 7 }]];
      if (sql.startsWith("INSERT")) insertado = true;
      return [[]];
    },
  });
  t.after(() => { pool.getConnection = originalGetConnection; });
  await assert.rejects(materiaPrimaService.crear({ ...bobina, peso_rollo: 25 }, 1), { statusCode: 409 });
  assert.equal(insertado, false);
  assert.ok(revertido);
});

test("ventas (CR-018): paquetes de 50, 100 o 500, hasta 1 000 paquetes y hasta $100.000.000 por venta", async () => {
  const venta = { cliente: "Cliente", inventario_id: 5, cantidad_paquetes: 2, unidades_paquete: 50, precio_paquete: 1000 };
  await assert.rejects(ventasService.registrar({ ...venta, unidades_paquete: 60 }, 1), /50, 100 o 500 unidades/);
  await assert.rejects(ventasService.registrar({ ...venta, cantidad_paquetes: 1001 }, 1), /máximo 1.000/);
  await assert.rejects(ventasService.registrar({ ...venta, cantidad_paquetes: "2abc" }, 1), /entero mayor que cero/);
  await assert.rejects(ventasService.registrar({ ...venta, precio_paquete: 100000001 }, 1), /precio por paquete admite como máximo \$100.000.000/);
  await assert.rejects(ventasService.registrar({ ...venta, cantidad_paquetes: 1000, precio_paquete: 100001 }, 1), /total de la venta admite como máximo \$100.000.000/);
});
