/**
 * Registro estructurado: una línea JSON por evento con fecha, nivel, módulo y mensaje.
 * Nivel con LOG_LEVEL (error, warn, info, debug o silent); por defecto info, y error
 * dentro de node --test para no llenar la salida de las pruebas.
 * Los campos sensibles se ocultan y nunca se registra el cuerpo de una petición.
 */
const NIVELES = { error: 0, warn: 1, info: 2, debug: 3 };
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

function escribir(nivel, modulo, mensaje, datos) {
  if (NIVELES[nivel] > nivelActivo()) return;
  const linea = JSON.stringify({ fecha: new Date().toISOString(), nivel, modulo, mensaje, ...limpiar(datos || {}) });
  (nivel === "error" || nivel === "warn" ? process.stderr : process.stdout).write(`${linea}\n`);
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

module.exports = { crearLogger, registrarPeticiones, limpiar };
