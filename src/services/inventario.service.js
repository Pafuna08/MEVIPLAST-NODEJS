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
  const [existente] = await pool.query("SELECT id FROM inventario WHERE producto = ?", [producto]);

  let id;
  if (existente.length > 0) {
    id = existente[0].id;
    await pool.query("UPDATE inventario SET cantidad = cantidad + ?, ubicacion = COALESCE(?, ubicacion) WHERE id = ?", [
      cantidad,
      ubicacion,
      id,
    ]);
  } else {
    const [resultado] = await pool.query(
      "INSERT INTO inventario (producto, cantidad, ubicacion) VALUES (?, ?, ?)",
      [producto, cantidad, ubicacion || null]
    );
    id = resultado.insertId;
  }

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "INGRESO_INVENTARIO",
    tabla: "inventario",
    detalle: `Ingreso de ${cantidad} unidades de '${producto}'`,
  });

  return obtenerPorId(id);
}

async function registrarSalida(id, cantidad, actorId) {
  const item = await obtenerPorId(id);
  if (!item) throw new Error("Producto de inventario no encontrado");
  if (item.cantidad < cantidad) throw new Error("Stock insuficiente para la salida solicitada");

  await pool.query("UPDATE inventario SET cantidad = cantidad - ? WHERE id = ?", [cantidad, id]);

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "SALIDA_INVENTARIO",
    tabla: "inventario",
    detalle: `Salida de ${cantidad} unidades de '${item.producto}'`,
  });

  return obtenerPorId(id);
}

module.exports = { listar, obtenerPorId, ingresar, registrarSalida };
