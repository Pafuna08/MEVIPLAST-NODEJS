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

// HU-022 / RF-027: cumplimiento de la meta por operario. Cuenta las órdenes
// asignadas al operario que se crearon en el periodo, sin las canceladas:
// cumplimiento = unidades producidas de esas órdenes / meta de esas órdenes.
// Lo producido de cada orden se limita a su meta.
function porcentaje(producido, meta) {
  return meta > 0 ? Math.round((producido / meta) * 1000) / 10 : null;
}

function calcularCumplimiento(filas, unidadesPorUsuario = new Map()) {
  const operarios = filas.map((fila) => {
    const meta = Number(fila.meta || 0);
    const producido = Number(fila.producido || 0);
    return {
      id: fila.id,
      nombre: fila.nombre,
      ordenes: Number(fila.ordenes || 0),
      finalizadas: Number(fila.finalizadas || 0),
      meta,
      producido,
      cumplimiento: porcentaje(producido, meta),
      unidades_periodo: Number(unidadesPorUsuario.get(fila.id) || 0),
    };
  });
  operarios.sort(
    (a, b) =>
      (b.cumplimiento ?? -1) - (a.cumplimiento ?? -1) ||
      a.nombre.localeCompare(b.nombre, "es"),
  );
  const sumar = (campo) => operarios.reduce((total, o) => total + o[campo], 0);
  const meta = sumar("meta");
  const producido = sumar("producido");
  return {
    resumen: {
      operarios: operarios.length,
      con_ordenes: operarios.filter((o) => o.ordenes > 0).length,
      ordenes: sumar("ordenes"),
      meta,
      producido,
      cumplimiento: porcentaje(producido, meta),
      unidades_periodo: sumar("unidades_periodo"),
    },
    operarios,
  };
}

async function rendimientoOperarios(periodo, ahora = new Date()) {
  const rango = limitesPeriodo(periodo, ahora);
  const [filas] = await pool.query(
    `SELECT u.id, u.nombre,
            COUNT(p.id) AS ordenes,
            COALESCE(SUM(p.estado = 'finalizado'), 0) AS finalizadas,
            COALESCE(SUM(p.cantidad), 0) AS meta,
            COALESCE(SUM(LEAST(p.cantidad_producida, p.cantidad)), 0) AS producido
     FROM usuarios u
     LEFT JOIN produccion p
       ON p.responsable_id = u.id AND p.estado <> 'cancelado'
      AND p.fecha_inicio >= ? AND p.fecha_inicio < ?
     WHERE u.rol = 'operario' AND u.activo = 1
     GROUP BY u.id, u.nombre`,
    [rango.desde, rango.hasta],
  );
  const [unidades] = await pool.query(
    `SELECT usuario_id, SUM(cantidad) AS unidades
     FROM movimientos_inventario
     WHERE tipo = 'produccion' AND fecha >= ? AND fecha < ?
     GROUP BY usuario_id`,
    [rango.desde, rango.hasta],
  );
  const unidadesPorUsuario = new Map(
    unidades.map((fila) => [fila.usuario_id, Number(fila.unidades)]),
  );
  return { periodo, ...rango, ...calcularCumplimiento(filas, unidadesPorUsuario) };
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
  const [filas] = await pool.query("SELECT producto, cantidad FROM inventario ORDER BY cantidad ASC");
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
  calcularCumplimiento,
  rendimientoOperarios,
  resumenInventario,
  bitacoraAuditoria,
};
