const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");
const inventarioService = require("./inventario.service");

async function listar() {
  const [filas] = await pool.query(
    `SELECT v.*, u.nombre AS vendedor
     FROM ventas v
     LEFT JOIN usuarios u ON u.id = v.usuario_id
     ORDER BY v.fecha DESC`
  );
  return filas;
}

async function obtenerPorId(id) {
  const [filas] = await pool.query("SELECT * FROM ventas WHERE id = ?", [id]);
  return filas[0] || null;
}

async function registrar({ cliente, producto, cantidad, precio_unitario }, actorId) {
  // Buscamos el producto en inventario para descontar stock (EP-003)
  const [inv] = await pool.query("SELECT id, cantidad FROM inventario WHERE producto = ?", [producto]);
  if (inv.length === 0 || inv[0].cantidad < cantidad) {
    throw new Error("Stock insuficiente en inventario para esta venta");
  }

  const [resultado] = await pool.query(
    "INSERT INTO ventas (cliente, producto, cantidad, precio_unitario, usuario_id) VALUES (?, ?, ?, ?, ?)",
    [cliente, producto, cantidad, precio_unitario, actorId]
  );

  await inventarioService.registrarSalida(inv[0].id, cantidad, actorId);

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "REGISTRAR_VENTA",
    tabla: "ventas",
    detalle: `Venta de ${cantidad} '${producto}' a '${cliente}'`,
  });

  return obtenerPorId(resultado.insertId);
}

module.exports = { listar, obtenerPorId, registrar };
