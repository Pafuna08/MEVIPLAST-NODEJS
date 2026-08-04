const { pool } = require("../config/database");

async function resumenProduccion() {
  const [filas] = await pool.query(
    `SELECT estado, COUNT(*) AS total, SUM(cantidad) AS cantidad_total
     FROM produccion GROUP BY estado`
  );
  return filas;
}

async function resumenVentas({ desde, hasta } = {}) {
  const condiciones = [];
  const valores = [];
  if (desde) {
    condiciones.push("fecha >= ?");
    valores.push(desde);
  }
  if (hasta) {
    condiciones.push("fecha <= ?");
    valores.push(hasta);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

  const [totales] = await pool.query(
    `SELECT COUNT(*) AS numero_ventas, COALESCE(SUM(total), 0) AS total_vendido
     FROM ventas ${where}`,
    valores
  );
  const [porProducto] = await pool.query(
    `SELECT producto, SUM(cantidad) AS unidades, SUM(total) AS total
     FROM ventas ${where} GROUP BY producto ORDER BY total DESC`,
    valores
  );

  return { resumen: totales[0], porProducto };
}

async function resumenInventario() {
  const [filas] = await pool.query("SELECT producto, cantidad, ubicacion FROM inventario ORDER BY cantidad ASC");
  return filas;
}

async function bitacoraAuditoria(limite = 100) {
  const [filas] = await pool.query(
    `SELECT a.*, u.usuario AS realizado_por
     FROM auditoria a
     LEFT JOIN usuarios u ON u.id = a.usuario_id
     ORDER BY a.fecha DESC LIMIT ?`,
    [limite]
  );
  return filas;
}

module.exports = { resumenProduccion, resumenVentas, resumenInventario, bitacoraAuditoria };
