const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");
const { productosTerminados } = require("../constants/productosTerminados");
const { motivosSalida } = require("../constants/motivosSalida");
const { normalizarVariante } = require("../utils/variantes");
const { entero } = require("../utils/numeros");

// Motivo obligatorio de la salida manual; «Otro» exige detalle. Devuelve el texto que se guarda
function validarMotivo(motivo, detalle) {
  if (!motivosSalida.includes(motivo)) {
    const error = new Error("Selecciona el motivo de la salida");
    error.statusCode = 400;
    throw error;
  }
  const texto = typeof detalle === "string" ? detalle.trim() : "";
  if (motivo === "Otro" && !texto) {
    const error = new Error("Describe el motivo de la salida");
    error.statusCode = 400;
    throw error;
  }
  if (texto.length > 200) {
    const error = new Error("El detalle del motivo no puede superar 200 caracteres");
    error.statusCode = 400;
    throw error;
  }
  return texto ? `${motivo}: ${texto}` : motivo;
}

// Línea del catálogo (RN-012) y variante con formato válido (RN-025); devuelve los valores normalizados
function validarVariante({ familia, medida, calibre, color }) {
  if (!productosTerminados.includes(familia)) {
    const error = new Error("Selecciona una línea de producto válida");
    error.statusCode = 400;
    throw error;
  }
  for (const [campo, valor] of Object.entries({ medida, calibre, color })) {
    if (typeof valor !== "string" || !valor.trim()) {
      const error = new Error(`${campo} es obligatorio`);
      error.statusCode = 400;
      throw error;
    }
  }
  // Largo de las columnas de inventario y producción (schema.sql)
  for (const [campo, valor, maximo] of [["medida", medida, 40], ["calibre", calibre, 40], ["color", color, 80]]) {
    if (valor.trim().length > maximo) {
      const error = new Error(`${campo} admite máximo ${maximo} caracteres`);
      error.statusCode = 400;
      throw error;
    }
  }
  const variante = normalizarVariante({ medida, calibre, color });
  const producto = `${familia} · ${variante.medida} · calibre ${variante.calibre} · ${variante.color}`;
  return { producto, ...variante };
}

async function listar() {
  const [filas] = await pool.query(
    `SELECT * FROM inventario
     WHERE familia IN (${productosTerminados.map(() => "?").join(", ")})
     ORDER BY familia, medida, calibre, color`,
    productosTerminados,
  );
  return filas;
}

async function obtenerPorId(id) {
  const [filas] = await pool.query("SELECT * FROM inventario WHERE id = ?", [
    id,
  ]);
  return filas[0] || null;
}

async function ingresar(
  {
    familia,
    medida,
    calibre,
    color,
    cantidad,
    tipo = "ingreso_manual",
    produccion_id = null,
  },
  actorId,
) {
  const cantidadNumerica = entero(cantidad, "La cantidad");
  if (tipo !== "ingreso_manual") {
    const error = new Error("Tipo de ingreso no válido");
    error.statusCode = 400;
    throw error;
  }
  const variante = validarVariante({ familia, medida, calibre, color });
  const { producto } = variante;

  const connection = await pool.getConnection();
  let id;
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [existente] = await connection.query(
      "SELECT id FROM inventario WHERE familia = ? AND medida = ? AND calibre = ? AND color = ? FOR UPDATE",
      [familia, variante.medida, variante.calibre, variante.color],
    );

    if (existente.length > 0) {
      id = existente[0].id;
      await connection.query(
        "UPDATE inventario SET cantidad = cantidad + ? WHERE id = ?",
        [cantidadNumerica, id],
      );
    } else {
      const [resultado] = await connection.query(
        "INSERT INTO inventario (producto, familia, medida, calibre, color, cantidad) VALUES (?, ?, ?, ?, ?, ?)",
        [producto, familia, variante.medida, variante.calibre, variante.color, cantidadNumerica],
      );
      id = resultado.insertId;
    }
    await connection.query(
      "INSERT INTO movimientos_inventario (inventario_id, usuario_id, produccion_id, tipo, cantidad) VALUES (?, ?, ?, ?, ?)",
      [id, actorId, produccion_id, tipo, cantidadNumerica],
    );
    await connection.commit();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "INGRESO_INVENTARIO",
    tabla: "inventario",
    detalle: `Ingreso de ${cantidadNumerica} unidades de '${producto}'`,
  });

  return obtenerPorId(id);
}

async function registrarSalida(
  id,
  cantidad,
  actorId,
  { motivo, detalle } = {},
) {
  const cantidadNumerica = entero(cantidad, "La cantidad");
  const observacion = validarMotivo(motivo, detalle);

  const connection = await pool.getConnection();
  let transactionStarted = false;
  let item;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [filas] = await connection.query(
      "SELECT id, producto, cantidad FROM inventario WHERE id = ? FOR UPDATE",
      [id],
    );
    item = filas[0];
    if (!item) throw new Error("Producto de inventario no encontrado");
    if (Number(item.cantidad) < cantidadNumerica) {
      throw new Error("Stock insuficiente para la salida solicitada");
    }
    await connection.query(
      "UPDATE inventario SET cantidad = cantidad - ? WHERE id = ?",
      [cantidadNumerica, id],
    );
    await connection.query(
      "INSERT INTO movimientos_inventario (inventario_id, usuario_id, tipo, cantidad, observaciones) VALUES (?, ?, 'salida_manual', ?, ?)",
      [id, actorId, cantidadNumerica, observacion],
    );
    await connection.commit();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "SALIDA_INVENTARIO",
    tabla: "inventario",
    detalle: `Salida de ${cantidadNumerica} unidades de '${item.producto}' (${observacion})`,
  });

  return obtenerPorId(id);
}

async function listarMovimientos(inventarioId) {
  const condiciones = inventarioId ? "WHERE m.inventario_id = ?" : "";
  const valores = inventarioId ? [inventarioId] : [];
  const [filas] = await pool.query(
    `SELECT m.*, i.producto, u.nombre AS registrado_por, p.id AS orden_id,
            v.cliente AS cliente_venta
     FROM movimientos_inventario m
     JOIN inventario i ON i.id = m.inventario_id
     LEFT JOIN usuarios u ON u.id = m.usuario_id
     LEFT JOIN produccion p ON p.id = m.produccion_id
     LEFT JOIN ventas v ON v.id = m.venta_id
     ${condiciones}
     ORDER BY m.fecha DESC, m.id DESC`,
    valores,
  );
  return filas;
}

module.exports = {
  listar,
  obtenerPorId,
  ingresar,
  registrarSalida,
  listarMovimientos,
  validarVariante,
};
