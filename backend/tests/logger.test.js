const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");

const { crearLogger, registrarPeticiones } = require("../src/utils/logger");

// Captura lo que el logger escribe en stdout y stderr durante la prueba
function capturar(t, nivel = "debug") {
  const lineas = [];
  const original = { out: process.stdout.write, err: process.stderr.write, nivel: process.env.LOG_LEVEL };
  process.env.LOG_LEVEL = nivel;
  process.stdout.write = (texto) => { lineas.push({ canal: "stdout", ...JSON.parse(texto) }); return true; };
  process.stderr.write = (texto) => { lineas.push({ canal: "stderr", ...JSON.parse(texto) }); return true; };
  t.after(() => {
    process.stdout.write = original.out;
    process.stderr.write = original.err;
    if (original.nivel === undefined) delete process.env.LOG_LEVEL; else process.env.LOG_LEVEL = original.nivel;
  });
  return lineas;
}

test("cada evento es una línea JSON con fecha, nivel, módulo y mensaje", (t) => {
  const lineas = capturar(t);
  crearLogger("ventas").info("Venta registrada", { venta_id: 15 });
  assert.equal(lineas.length, 1);
  const [linea] = lineas;
  assert.equal(linea.nivel, "info");
  assert.equal(linea.modulo, "ventas");
  assert.equal(linea.mensaje, "Venta registrada");
  assert.equal(linea.venta_id, 15);
  assert.ok(!Number.isNaN(Date.parse(linea.fecha)));
  assert.equal(linea.canal, "stdout");
});

test("LOG_LEVEL filtra los eventos y los errores van a stderr", (t) => {
  const lineas = capturar(t, "warn");
  const log = crearLogger("prueba");
  log.debug("no se escribe");
  log.info("no se escribe");
  log.warn("advertencia");
  log.error("falla");
  assert.deepEqual(lineas.map((l) => [l.nivel, l.canal]), [["warn", "stderr"], ["error", "stderr"]]);
});

test("los campos sensibles se ocultan y los errores se convierten a texto", (t) => {
  const lineas = capturar(t);
  const error = new Error("Stock insuficiente");
  error.code = "STOCK";
  crearLogger("auth").error("Fallo", { usuario: "ana", password: "secreta", datos: { token: "abc", correo: "a@b.co" }, error });
  const [linea] = lineas;
  assert.equal(linea.usuario, "ana");
  assert.equal(linea.password, "[oculto]");
  assert.equal(linea.datos.token, "[oculto]");
  assert.equal(linea.datos.correo, "[oculto]");
  assert.equal(linea.error.mensaje, "Stock insuficiente");
  assert.equal(linea.error.codigo, "STOCK");
  assert.match(linea.error.stack, /Stock insuficiente/);
});

test("cada petición deja una línea con método, ruta sin consulta, estado, duración y usuario, sin el cuerpo", (t) => {
  const lineas = capturar(t);
  const req = { method: "POST", originalUrl: "/api/ventas?debug=1", usuario: { id: 7, rol: "vendedor" }, body: { cliente: "X", password: "nunca" } };
  const res = Object.assign(new EventEmitter(), { statusCode: 400 });
  let siguio = false;
  registrarPeticiones(req, res, () => { siguio = true; });
  res.emit("finish");
  assert.equal(siguio, true);
  const [linea] = lineas;
  assert.equal(linea.modulo, "http");
  assert.equal(linea.nivel, "warn", "un 4xx se registra como advertencia");
  assert.equal(linea.metodo, "POST");
  assert.equal(linea.ruta, "/api/ventas");
  assert.equal(linea.estado, 400);
  assert.equal(linea.usuario_id, 7);
  assert.equal(linea.rol, "vendedor");
  assert.ok(Number.isInteger(linea.duracion_ms));
  assert.equal(JSON.stringify(linea).includes("nunca"), false, "no se registra el cuerpo de la petición");
});
