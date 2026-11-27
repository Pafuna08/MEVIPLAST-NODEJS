const test = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../src/config/database");
const lineasService = require("../src/services/lineas.service");
const inventarioService = require("../src/services/inventario.service");
const { productosTerminados } = require("../src/constants/productosTerminados");

function simularBase(t, responder) {
  const original = pool.query;
  const consultas = [];
  pool.query = async (sql, params = []) => {
    consultas.push({ sql, params });
    return responder(sql, params);
  };
  t.after(() => { pool.query = original; });
  return consultas;
}

test("el nombre de una línea nueva se limpia y sigue su formato (CR-020)", () => {
  assert.equal(lineasService.normalizarNombre("  bolsa   de regalo "), "Bolsa de regalo");
  assert.equal(lineasService.normalizarNombre("Sello fondo 2.5-B"), "Sello fondo 2.5-B");
  for (const [valor, mensaje] of [
    ["", /obligatorio/],
    [undefined, /obligatorio/],
    ["ab", /entre 3 y 60/],
    ["x".repeat(61), /entre 3 y 60/],
    ["123", /solo admite/],
    ["Bolsa <b>", /solo admite/],
    ["Línea; DROP", /solo admite/],
  ]) {
    assert.throws(() => lineasService.normalizarNombre(valor), { statusCode: 400, message: mensaje });
  }
});

test("listar devuelve las líneas de la tabla y, sin la tabla, las seis de base", async (t) => {
  let sinTabla = false;
  simularBase(t, async () => {
    if (sinTabla) throw Object.assign(new Error("no existe"), { code: "ER_NO_SUCH_TABLE" });
    return [[...productosTerminados, "Bolsa de regalo"].map((nombre) => ({ nombre }))];
  });
  assert.deepEqual(await lineasService.listar(), [...productosTerminados, "Bolsa de regalo"]);
  sinTabla = true;
  assert.deepEqual(await lineasService.listar(), productosTerminados);
});

test("paraValidar no consulta la base con una línea de base", async (t) => {
  const consultas = simularBase(t, async () => [[{ nombre: "Bolsa de regalo" }]]);
  assert.deepEqual(await lineasService.paraValidar("Cargadera"), productosTerminados);
  assert.equal(consultas.length, 0);
  assert.deepEqual(await lineasService.paraValidar("Bolsa de regalo"), ["Bolsa de regalo"]);
  assert.equal(consultas.length, 1);
});

test("crear guarda la línea, la audita y responde 409 si ya existe", async (t) => {
  const existentes = new Set(["Cargadera"]);
  const consultas = simularBase(t, async (sql, params) => {
    if (sql.startsWith("SELECT nombre FROM lineas_producto WHERE nombre")) {
      // La intercalación de la columna no distingue mayúsculas ni tildes
      const igual = [...existentes].find((nombre) => nombre.localeCompare(params[0], "es", { sensitivity: "base" }) === 0);
      return [igual ? [{ nombre: igual }] : []];
    }
    if (sql.startsWith("INSERT INTO lineas_producto")) { existentes.add(params[0]); return [{ insertId: 7 }]; }
    if (sql.startsWith("INSERT INTO auditoria")) return [{}];
    throw new Error(`consulta inesperada: ${sql}`);
  });
  assert.deepEqual(await lineasService.crear({ nombre: "bolsa de regalo" }, 1), { nombre: "Bolsa de regalo" });
  const auditoria = consultas.find(({ sql }) => sql.startsWith("INSERT INTO auditoria"));
  assert.deepEqual(auditoria.params.slice(0, 3), [1, "CREAR_LINEA_PRODUCTO", "lineas_producto"]);
  await assert.rejects(lineasService.crear({ nombre: "CARGADERA" }, 1), { statusCode: 409, message: "La línea «Cargadera» ya existe" });
  await assert.rejects(lineasService.crear({ nombre: "Bolsa de regalo" }, 1), { statusCode: 409 });
});

test("una línea creada por el administrador sirve en el inventario y se mide en ancho x largo", async (t) => {
  simularBase(t, async (sql) => {
    if (sql.startsWith("SELECT nombre FROM lineas_producto")) return [[...productosTerminados, "Bolsa de regalo"].map((nombre) => ({ nombre }))];
    throw new Error(`consulta inesperada: ${sql}`);
  });
  const lineas = await lineasService.paraValidar("Bolsa de regalo");
  const variante = inventarioService.validarVariante({ familia: "Bolsa de regalo", medida: "20x30", calibre: "2", color: "rojo" }, lineas);
  assert.equal(variante.producto, "Bolsa de regalo · 20 x 30 · calibre 2 · Rojo");
  assert.throws(() => inventarioService.validarVariante({ familia: "Bolsa de regalo", medida: "T20", calibre: "2", color: "Rojo" }, lineas), /ancho x largo/);
});
