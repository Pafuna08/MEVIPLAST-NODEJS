const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pool } = require("../src/config/database");
const logger = require("../src/utils/logger");
const reportesService = require("../src/services/reportes.service");
const { lineaCsv, mesesRetencion } = require("../src/services/archivoAuditoria.service");

function directorioTemporal(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "meviplast-logs-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function conEntorno(t, valores) {
  const anteriores = Object.fromEntries(Object.keys(valores).map((clave) => [clave, process.env[clave]]));
  Object.assign(process.env, valores);
  t.after(() => {
    for (const [clave, valor] of Object.entries(anteriores)) {
      if (valor === undefined) delete process.env[clave];
      else process.env[clave] = valor;
    }
  });
}

test("CR-016: los inicios de sesión van a un archivo plano diario y no a la base", async (t) => {
  const dir = directorioTemporal(t);
  conEntorno(t, { LOG_DIR: dir, LOG_LEVEL: "info" });
  const escrituras = [];
  const original = process.stdout.write;
  process.stdout.write = (texto) => { escrituras.push(String(texto)); return true; };
  try {
    logger.registrarAcceso("Inicio de sesión", { usuario: "admin", usuario_id: 1, password: "no-debe-verse" });
  } finally {
    process.stdout.write = original;
  }
  const archivo = path.join(dir, `accesos-${logger.fechaLocal()}.log`);
  for (let i = 0; i < 20 && !(fs.existsSync(archivo) && fs.readFileSync(archivo, "utf8")); i += 1) {
    await new Promise((listo) => setTimeout(listo, 25));
  }
  const linea = JSON.parse(fs.readFileSync(archivo, "utf8").trim().split("\n").pop());
  assert.equal(linea.modulo, "accesos");
  assert.equal(linea.mensaje, "Inicio de sesión");
  assert.equal(linea.usuario, "admin");
  assert.equal(linea.password, "[oculto]", "los campos sensibles se ocultan también en el archivo");
  assert.equal(escrituras.length, 1, "la línea sigue saliendo por la consola");
});

test("CR-016: los archivos de log con más días que la retención se borran", (t) => {
  const dir = directorioTemporal(t);
  for (const nombre of ["servidor-2026-01-01.log", "accesos-2026-08-10.log", "servidor-2026-11-01.log", "notas.txt"]) {
    fs.writeFileSync(path.join(dir, nombre), "x");
  }
  const borrados = logger.limpiarLogsAntiguos(dir, 90, new Date(2026, 10, 9));
  assert.deepEqual(borrados.sort(), ["accesos-2026-08-10.log", "servidor-2026-01-01.log"]);
  assert.deepEqual(fs.readdirSync(dir).sort(), ["notas.txt", "servidor-2026-11-01.log"]);
});

test("CR-016: LOG_DIR=off desactiva los archivos", (t) => {
  conEntorno(t, { LOG_DIR: "off" });
  assert.equal(logger.directorioLogs(), null);
});

function simularConsultas(t, total = 3) {
  const original = pool.query;
  const consultas = [];
  pool.query = async (sql, params = []) => {
    consultas.push({ sql, params });
    if (sql.startsWith("SELECT COUNT(*)")) return [[{ total }]];
    if (sql.includes("DISTINCT accion")) return [[{ accion: "CREAR_USUARIO" }, { accion: "REGISTRAR_VENTA" }]];
    if (sql.includes("DISTINCT tabla_afectada")) return [[{ tabla_afectada: "usuarios" }]];
    if (sql.includes("DISTINCT u.id")) return [[{ id: 1, usuario: "admin" }]];
    return [[{ id: 9, accion: "REGISTRAR_VENTA" }]];
  };
  t.after(() => { pool.query = original; });
  return consultas;
}

test("RF-029 / CR-016: la auditoría filtra en el servidor por fechas, usuario, acción, módulo y texto", async (t) => {
  const consultas = simularConsultas(t, 120);
  const resultado = await reportesService.bitacoraAuditoria({
    desde: "2026-11-01", hasta: "2026-11-09", usuario_id: "1", accion: "REGISTRAR_VENTA", tabla: "ventas", texto: "50%_off", pagina: "2", porPagina: "50",
  });
  const conteo = consultas.find(({ sql }) => sql.startsWith("SELECT COUNT(*)"));
  assert.match(conteo.sql, /a\.fecha >= \? AND a\.fecha < DATE_ADD\(\?, INTERVAL 1 DAY\) AND a\.usuario_id = \? AND a\.accion = \? AND a\.tabla_afectada = \? AND a\.detalle LIKE \?/);
  assert.deepEqual(conteo.params, ["2026-11-01 00:00:00", "2026-11-09", 1, "REGISTRAR_VENTA", "ventas", "%50\\%\\_off%"]);
  const pagina = consultas.find(({ sql }) => sql.includes("LIMIT ? OFFSET ?"));
  assert.deepEqual(pagina.params.slice(-2), [50, 50], "segunda página de 50");
  assert.deepEqual([resultado.total, resultado.pagina, resultado.paginas], [120, 2, 3]);
  assert.deepEqual(resultado.opciones, { acciones: ["CREAR_USUARIO", "REGISTRAR_VENTA"], tablas: ["usuarios"], usuarios: [{ id: 1, usuario: "admin" }] });
});

test("RF-029 / CR-016: sin filtros se consulta toda la tabla por páginas de máximo 100", async (t) => {
  const consultas = simularConsultas(t);
  const resultado = await reportesService.bitacoraAuditoria({ porPagina: "5000" });
  const conteo = consultas.find(({ sql }) => sql.startsWith("SELECT COUNT(*)"));
  assert.doesNotMatch(conteo.sql, /WHERE/);
  assert.equal(resultado.porPagina, 100);
});

test("RF-029 / CR-016: los filtros con formato inválido se rechazan con 400", async () => {
  for (const [filtros, patron] of [
    [{ desde: "09/11/2026" }, /fecha inicial/],
    [{ desde: "2026-11-09", hasta: "2026-11-01" }, /posterior/],
    [{ usuario_id: "abc" }, /usuario/],
    [{ accion: "LOGIN'; DROP TABLE auditoria;--" }, /acción/],
    [{ tabla: "Usuarios" }, /módulo/],
    [{ texto: "x".repeat(101) }, /100 caracteres/],
  ]) {
    await assert.rejects(reportesService.bitacoraAuditoria(filtros), (error) => error.statusCode === 400 && patron.test(error.message));
  }
});

test("CR-016: el archivo plano de la auditoría es un CSV con punto y coma y comillas cuando hace falta", () => {
  assert.equal(
    lineaCsv({ id: 7, fecha: "2025-01-02 10:00:00", usuario_id: 1, usuario: "admin", accion: "REGISTRAR_VENTA", tabla: "ventas", detalle: 'Venta "V-1"; 2 paquetes' }),
    '7;2025-01-02 10:00:00;1;admin;REGISTRAR_VENTA;ventas;"Venta ""V-1""; 2 paquetes"',
  );
  assert.equal(lineaCsv({ id: 8, fecha: "2025-01-02", usuario_id: null, usuario: null, accion: "X", tabla: "t", detalle: null }), "8;2025-01-02;;;X;t;");
  assert.equal(mesesRetencion("0"), 12);
  assert.equal(mesesRetencion("6"), 6);
});
