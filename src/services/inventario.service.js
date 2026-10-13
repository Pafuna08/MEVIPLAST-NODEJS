const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");

async function listar() {
  const [filas] = await pool.query("SELECT * FROM inventario ORDER BY producto ASC");
  return filas;
}

async function obtenerPorId(id) {
  const [filas] = await pool.query("SELECT * FROM inventario WHERE id = ?", [id]);
  return filas[0] || null;
}

async function ingresar({ producto, cantidad, ubicacion }, actorId) {
  const cantidadNumerica = Number(cantidad);
  if (!Number.isFinite(cantidadNumerica) || cantidadNumerica <= 0) {
    throw new Error("La cantidad debe ser mayor que cero");
  }

  const [existente] = await pool.query("SELECT id FROM inventario WHERE producto = ?", [producto]);

  let id;
  if (existente.length > 0) {
    id = existente[0].id;
    await pool.query("UPDATE inventario SET cantidad = cantidad + ?, ubicacion = COALESCE(?, ubicacion) WHERE id = ?", [
      cantidadNumerica,
      ubicacion,
      id,
    ]);
  } else {
    const [resultado] = await pool.query(
      "INSERT INTO inventario (producto, cantidad, ubicacion) VALUES (?, ?, ?)",
      [producto, cantidadNumerica, ubicacion || null]
    );
    id = resultado.insertId;
  }

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "INGRESO_INVENTARIO",
    tabla: "inventario",
    detalle: `Ingreso de ${cantidadNumerica} unidades de '${producto}'`,
  });

  return obtenerPorId(id);
}

async function registrarSalida(id, cantidad, actorId) {
  const cantidadNumerica = Number(cantidad);
  if (!Number.isFinite(cantidadNumerica) || cantidadNumerica <= 0) {
    throw new Error("La cantidad debe ser mayor que cero");
  }

  const item = await obtenerPorId(id);
  if (!item) throw new Error("Producto de inventario no encontrado");
  if (Number(item.cantidad) < cantidadNumerica) throw new Error("Stock insuficiente para la salida solicitada");

  const [resultado] = await pool.query(
    "UPDATE inventario SET cantidad = cantidad - ? WHERE id = ? AND cantidad >= ?",
    [cantidadNumerica, id, cantidadNumerica]
  );
  if (!resultado.affectedRows) throw new Error("Stock insuficiente para la salida solicitada");

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "SALIDA_INVENTARIO",
    tabla: "inventario",
    detalle: `Salida de ${cantidadNumerica} unidades de '${item.producto}'`,
  });

  return obtenerPorId(id);
}

module.exports = { listar, obtenerPorId, ingresar, registrarSalida };
