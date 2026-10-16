const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");

async function listar() {
  const [filas] = await pool.query(
    `SELECT v.*, u.nombre AS vendedor
     FROM ventas v
     LEFT JOIN usuarios u ON u.id = v.usuario_id
     ORDER BY v.fecha DESC`,
  );
  return filas;
}

async function obtenerPorId(id) {
  const [filas] = await pool.query("SELECT * FROM ventas WHERE id = ?", [id]);
  return filas[0] || null;
}

async function registrar(
  { cliente, producto, cantidad, precio_unitario },
  actorId,
) {
  const cantidadNumerica = Number(cantidad);
  const precioUnitarioNumerico = Number(precio_unitario);
  if (!Number.isFinite(cantidadNumerica) || cantidadNumerica <= 0) {
    throw new Error("La cantidad debe ser mayor que cero");
  }
  if (!Number.isFinite(precioUnitarioNumerico) || precioUnitarioNumerico <= 0) {
    throw new Error("El precio unitario debe ser mayor que cero");
  }

  const connection = await pool.getConnection();
  let saleId;
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [inventario] = await connection.query(
      "SELECT id, cantidad FROM inventario WHERE producto = ? FOR UPDATE",
      [producto],
    );
    if (
      inventario.length === 0 ||
      Number(inventario[0].cantidad) < cantidadNumerica
    ) {
      throw new Error("Stock insuficiente en inventario para esta venta");
    }

    const [resultado] = await connection.query(
      "INSERT INTO ventas (cliente, producto, cantidad, precio_unitario, usuario_id) VALUES (?, ?, ?, ?, ?)",
      [cliente, producto, cantidadNumerica, precioUnitarioNumerico, actorId],
    );
    await connection.query(
      "UPDATE inventario SET cantidad = cantidad - ? WHERE id = ? AND cantidad >= ?",
      [cantidadNumerica, inventario[0].id, cantidadNumerica],
    );
    await connection.commit();
    transactionStarted = false;
    saleId = resultado.insertId;
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
    detalle: `Salida de ${cantidadNumerica} unidades de '${producto}'`,
  });

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "REGISTRAR_VENTA",
    tabla: "ventas",
    detalle: `Venta de ${cantidadNumerica} '${producto}' a '${cliente}'`,
  });

  return obtenerPorId(saleId);
}

module.exports = { listar, obtenerPorId, registrar };
