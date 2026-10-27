const { pool } = require("../config/database");

const periodosValidos = new Set(["diario", "semanal", "mensual", "anual"]);

function limitesPeriodo(periodo, ahora = new Date()) {
  if (!periodosValidos.has(periodo)) {
    throw new Error("El periodo debe ser diario, semanal, mensual o anual");
  }
  const inicio = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
  );
  if (periodo === "semanal") {
    const diasDesdeLunes = (inicio.getDay() + 6) % 7;
    inicio.setDate(inicio.getDate() - diasDesdeLunes);
  } else if (periodo === "mensual") {
    inicio.setDate(1);
  } else if (periodo === "anual") {
    inicio.setMonth(0, 1);
  }

  const fin = new Date(inicio);
  if (periodo === "diario") fin.setDate(fin.getDate() + 1);
  if (periodo === "semanal") fin.setDate(fin.getDate() + 7);
  if (periodo === "mensual") fin.setMonth(fin.getMonth() + 1);
  if (periodo === "anual") fin.setFullYear(fin.getFullYear() + 1);

  const formato = (fecha) =>
    `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
  return { desde: formato(inicio), hasta: formato(fin), hastaInclusivo: formato(new Date(fin.getTime() - 86400000)) };
}

async function detalleProduccion(periodo, ahora = new Date()) {
  const rango = limitesPeriodo(periodo, ahora);
  const [detalle] = await pool.query(
    `SELECT mi.id, mi.fecha, mi.cantidad, mi.produccion_id AS orden_id,
            i.producto, u.nombre AS operario
     FROM movimientos_inventario mi
     JOIN inventario i ON i.id = mi.inventario_id
     LEFT JOIN usuarios u ON u.id = mi.usuario_id
     WHERE mi.tipo = 'produccion' AND mi.fecha >= ? AND mi.fecha < ?
     ORDER BY mi.fecha DESC, mi.id DESC`,
    [rango.desde, rango.hasta],
  );
  const [resumen] = await pool.query(
    `SELECT COUNT(*) AS movimientos, COALESCE(SUM(mi.cantidad), 0) AS unidades
     FROM movimientos_inventario mi
     WHERE mi.tipo = 'produccion' AND mi.fecha >= ? AND mi.fecha < ?`,
    [rango.desde, rango.hasta],
  );
  const [porProducto] = await pool.query(
    `SELECT i.producto, SUM(mi.cantidad) AS unidades
     FROM movimientos_inventario mi
     JOIN inventario i ON i.id = mi.inventario_id
     WHERE mi.tipo = 'produccion' AND mi.fecha >= ? AND mi.fecha < ?
     GROUP BY i.producto ORDER BY unidades DESC`,
    [rango.desde, rango.hasta],
  );
  return { periodo, ...rango, resumen: resumen[0], porProducto, detalle };
}

async function detalleVentas(periodo, ahora = new Date()) {
  const rango = limitesPeriodo(periodo, ahora);
  const [detalle] = await pool.query(
    `SELECT id, fecha, cliente, producto, cantidad, precio_unitario, total
     FROM ventas
     WHERE fecha >= ? AND fecha < ?
     ORDER BY fecha DESC, id DESC`,
    [rango.desde, rango.hasta],
  );
  const [resumen] = await pool.query(
    `SELECT COUNT(*) AS numero_ventas, COALESCE(SUM(cantidad), 0) AS unidades,
            COALESCE(SUM(total), 0) AS total_vendido
     FROM ventas WHERE fecha >= ? AND fecha < ?`,
    [rango.desde, rango.hasta],
  );
  const [porProducto] = await pool.query(
    `SELECT producto, SUM(cantidad) AS unidades, SUM(total) AS total
     FROM ventas WHERE fecha >= ? AND fecha < ?
     GROUP BY producto ORDER BY total DESC`,
    [rango.desde, rango.hasta],
  );
  return { periodo, ...rango, resumen: resumen[0], porProducto, detalle };
}

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

// Entre 1 y 1 000 registros, del más reciente al más antiguo (el id desempata eventos del mismo segundo)
async function bitacoraAuditoria(limite = 100) {
  const cantidad = Math.min(Math.max(Math.trunc(Number(limite)) || 100, 1), 1000);
  const [filas] = await pool.query(
    `SELECT a.*, u.usuario AS realizado_por
     FROM auditoria a
     LEFT JOIN usuarios u ON u.id = a.usuario_id
     ORDER BY a.fecha DESC, a.id DESC LIMIT ?`,
    [cantidad]
  );
  return filas;
}

module.exports = {
  limitesPeriodo,
  resumenProduccion,
  resumenVentas,
  detalleProduccion,
  detalleVentas,
  resumenInventario,
  bitacoraAuditoria,
};
