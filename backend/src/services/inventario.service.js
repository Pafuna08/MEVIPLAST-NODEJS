const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");

async function listar() {
  const [filas] = await pool.query(
    "SELECT * FROM inventario ORDER BY producto ASC",
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
    producto,
    cantidad,
    ubicacion,
    tipo = "ingreso_manual",
    produccion_id = null,
  },
  actorId,
) {
  const cantidadNumerica = Number(cantidad);
  if (!Number.isFinite(cantidadNumerica) || cantidadNumerica <= 0) {
    throw new Error("La cantidad debe ser mayor que cero");
  }
  if (tipo !== "ingreso_manual") {
    throw new Error("Tipo de ingreso no válido");
  }

  const connection = await pool.getConnection();
  let id;
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [existente] = await connection.query(
      "SELECT id FROM inventario WHERE producto = ? FOR UPDATE",
      [producto],
    );

    if (existente.length > 0) {
      id = existente[0].id;
      await connection.query(
        "UPDATE inventario SET cantidad = cantidad + ?, ubicacion = COALESCE(?, ubicacion) WHERE id = ?",
        [cantidadNumerica, ubicacion, id],
      );
    } else {
      const [resultado] = await connection.query(
        "INSERT INTO inventario (producto, cantidad, ubicacion) VALUES (?, ?, ?)",
        [producto, cantidadNumerica, ubicacion || null],
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
  { tipo = "salida_manual" } = {},
) {
  const cantidadNumerica = Number(cantidad);
  if (!Number.isFinite(cantidadNumerica) || cantidadNumerica <= 0) {
    throw new Error("La cantidad debe ser mayor que cero");
  }

  if (tipo !== "salida_manual") throw new Error("Tipo de salida no válido");
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
      "INSERT INTO movimientos_inventario (inventario_id, usuario_id, tipo, cantidad) VALUES (?, ?, 'salida_manual', ?)",
      [id, actorId, cantidadNumerica],
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
    detalle: `Salida de ${cantidadNumerica} unidades de '${item.producto}'`,
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
};
