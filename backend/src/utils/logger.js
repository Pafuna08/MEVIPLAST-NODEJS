/**
 * Registro estructurado: una línea JSON por evento con fecha, nivel, módulo y mensaje.
 * Nivel con LOG_LEVEL (error, warn, info, debug o silent); por defecto info, y error
 * dentro de node --test para no llenar la salida de las pruebas.
 * Los campos sensibles se ocultan y nunca se registra el cuerpo de una petición.
 *
 * CR-016: además de la consola, cada línea se guarda en un archivo plano diario en LOG_DIR
 * (por defecto backend/logs): servidor-AAAA-MM-DD.log para el servidor y accesos-AAAA-MM-DD.log
 * para los inicios de sesión, que ya no se guardan en la tabla de auditoría. Los archivos con
 * más de LOG_RETENTION_DAYS días (90 por defecto) se borran solos. LOG_DIR=off los desactiva,
 * y dentro de node --test no se escriben salvo que LOG_DIR se indique.
 */
const fs = require("fs");
const path = require("path");

const NIVELES = { error: 0, warn: 1, info: 2, debug: 3 };
const ARCHIVO_LOG = /^(servidor|accesos)-(\d{4}-\d{2}-\d{2})\.log$/;
const flujos = new Map();
let ultimaLimpieza = "";

function directorioLogs() {
  const valor = (process.env.LOG_DIR || "").trim();
  if (valor.toLowerCase() === "off") return null;
  if (!valor) return process.env.NODE_TEST_CONTEXT ? null : path.join(__dirname, "..", "..", "logs");
  return path.resolve(valor);
}

function diasRetencion() {
  const dias = Math.trunc(Number(process.env.LOG_RETENTION_DAYS));
  return Number.isFinite(dias) && dias >= 1 ? dias : 90;
}

// Fecha local AAAA-MM-DD: el archivo del día corresponde al día en el servidor de la empresa
function fechaLocal(fecha = new Date()) {
  return [fecha.getFullYear(), String(fecha.getMonth() + 1).padStart(2, "0"), String(fecha.getDate()).padStart(2, "0")].join("-");
}

// Borra los archivos de log más viejos que la retención; devuelve los nombres borrados
function limpiarLogsAntiguos(directorio = directorioLogs(), dias = diasRetencion(), hoy = new Date()) {
  if (!directorio || !fs.existsSync(directorio)) return [];
  const limite = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - dias);
  const borrados = [];
  for (const nombre of fs.readdirSync(directorio)) {
    const partes = ARCHIVO_LOG.exec(nombre);
    if (!partes) continue;
    const [anio, mes, dia] = partes[2].split("-").map(Number);
    if (new Date(anio, mes - 1, dia) < limite) {
      fs.rmSync(path.join(directorio, nombre), { force: true });
      borrados.push(nombre);
    }
  }
  return borrados;
}

function escribirArchivo(canal, linea) {
  const directorio = directorioLogs();
  if (!directorio) return;
  try {
    const hoy = fechaLocal();
    const clave = `${directorio}|${canal}`;
    let actual = flujos.get(clave);
    if (!actual || actual.fecha !== hoy) {
      actual?.flujo.end();
      fs.mkdirSync(directorio, { recursive: true });
      const flujo = fs.createWriteStream(path.join(directorio, `${canal}-${hoy}.log`), { flags: "a" });
      flujo.on("error", () => {});
      actual = { fecha: hoy, flujo };
      flujos.set(clave, actual);
    }
    actual.flujo.write(`${linea}\n`);
    if (ultimaLimpieza !== hoy) {
      ultimaLimpieza = hoy;
      limpiarLogsAntiguos(directorio);
    }
  } catch {
    // Un problema con el disco no debe tumbar el servidor; la línea sigue en la consola
  }
}
const SENSIBLES = /^(password|password_hash|token|token_hash|authorization|cookie|correo|jwt_secret|smtp_password)$/i;
const PROFUNDIDAD_MAXIMA = 4;

function nivelActivo() {
  const nivel = (process.env.LOG_LEVEL || (process.env.NODE_TEST_CONTEXT ? "error" : "info")).toLowerCase();
  if (nivel === "silent") return -1;
  return NIVELES[nivel] ?? NIVELES.info;
}

// Copia segura de los datos: oculta campos sensibles y convierte los errores en texto
function limpiar(valor, profundidad = 0) {
  if (valor instanceof Error) {
    return { nombre: valor.name, mensaje: valor.message, ...(valor.code ? { codigo: valor.code } : {}), stack: valor.stack };
  }
  if (valor === null || typeof valor !== "object") return valor;
  if (profundidad >= PROFUNDIDAD_MAXIMA) return "[...]";
  if (Array.isArray(valor)) return valor.map((item) => limpiar(item, profundidad + 1));
  return Object.fromEntries(Object.entries(valor).map(([clave, item]) => [
    clave,
    SENSIBLES.test(clave) ? "[oculto]" : limpiar(item, profundidad + 1),
  ]));
}

function escribir(nivel, modulo, mensaje, datos, canal = "servidor") {
  if (NIVELES[nivel] > nivelActivo()) return;
  const linea = JSON.stringify({ fecha: new Date().toISOString(), nivel, modulo, mensaje, ...limpiar(datos || {}) });
  (nivel === "error" || nivel === "warn" ? process.stderr : process.stdout).write(`${linea}\n`);
  escribirArchivo(canal, linea);
}

// Inicios de sesión e intentos fallidos (CR-016): van al archivo de accesos, no a la base de datos
function registrarAcceso(mensaje, datos, nivel = "info") {
  escribir(nivel, "accesos", mensaje, datos, "accesos");
}

function crearLogger(modulo) {
  return Object.fromEntries(Object.keys(NIVELES).map((nivel) => [nivel, (mensaje, datos) => escribir(nivel, modulo, mensaje, datos)]));
}

// Una línea por petición a la API: método, ruta sin parámetros de consulta, estado, duración y usuario
const http = crearLogger("http");
function registrarPeticiones(req, res, next) {
  const inicio = process.hrtime.bigint();
  res.on("finish", () => {
    const estado = res.statusCode;
    const nivel = estado >= 500 ? "error" : estado >= 400 ? "warn" : "info";
    http[nivel]("Petición atendida", {
      metodo: req.method,
      ruta: req.originalUrl.split("?")[0],
      estado,
      duracion_ms: Number((process.hrtime.bigint() - inicio) / 1000000n),
      ...(req.usuario ? { usuario_id: req.usuario.id, rol: req.usuario.rol } : {}),
    });
  });
  next();
}

module.exports = { crearLogger, registrarPeticiones, registrarAcceso, limpiar, limpiarLogsAntiguos, fechaLocal, directorioLogs };
