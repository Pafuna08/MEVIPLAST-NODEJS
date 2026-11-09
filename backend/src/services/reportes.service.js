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

function filtroInvalido(mensaje) {
  const error = new Error(mensaje);
  error.statusCode = 400;
  return error;
}

// RF-029 con CR-016: el administrador elige qué buscar (fechas, usuario, acción, módulo y texto del
// detalle) y el servidor filtra toda la tabla y devuelve una página (20 por defecto, máximo 100).
async function bitacoraAuditoria(filtros = {}) {
  const condiciones = [];
  const valores = [];
  const fecha = /^\d{4}-\d{2}-\d{2}$/;
  const { desde, hasta, usuario_id, accion, tabla, texto } = filtros;
  if (desde !== undefined && desde !== "") {
    if (!fecha.test(desde)) throw filtroInvalido("La fecha inicial debe tener el formato AAAA-MM-DD");
    condiciones.push("a.fecha >= ?");
    valores.push(`${desde} 00:00:00`);
  }
  if (hasta !== undefined && hasta !== "") {
    if (!fecha.test(hasta)) throw filtroInvalido("La fecha final debe tener el formato AAAA-MM-DD");
    if (desde && desde > hasta) throw filtroInvalido("La fecha inicial no puede ser posterior a la final");
    condiciones.push("a.fecha < DATE_ADD(?, INTERVAL 1 DAY)");
    valores.push(hasta);
  }
  if (usuario_id !== undefined && usuario_id !== "") {
    const id = Number(usuario_id);
    if (!Number.isInteger(id) || id <= 0) throw filtroInvalido("El usuario del filtro no es válido");
    condiciones.push("a.usuario_id = ?");
    valores.push(id);
  }
  if (accion !== undefined && accion !== "") {
    if (!/^[A-Z_]{1,100}$/.test(accion)) throw filtroInvalido("La acción del filtro no es válida");
    condiciones.push("a.accion = ?");
    valores.push(accion);
  }
  if (tabla !== undefined && tabla !== "") {
    if (!/^[a-z_]{1,60}$/.test(tabla)) throw filtroInvalido("El módulo del filtro no es válido");
    condiciones.push("a.tabla_afectada = ?");
    valores.push(tabla);
  }
  if (texto !== undefined && String(texto).trim() !== "") {
    const buscado = String(texto).trim();
    if (buscado.length > 100) throw filtroInvalido("El texto a buscar admite máximo 100 caracteres");
    condiciones.push("a.detalle LIKE ?");
    valores.push(`%${buscado.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  }
  const porPagina = Math.min(Math.max(Math.trunc(Number(filtros.porPagina)) || 20, 1), 100);
  const pagina = Math.max(Math.trunc(Number(filtros.pagina)) || 1, 1);
  const donde = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM auditoria a ${donde}`, valores);
  const [registros] = await pool.query(
    `SELECT a.*, u.usuario AS realizado_por
     FROM auditoria a
     LEFT JOIN usuarios u ON u.id = a.usuario_id
     ${donde}
     ORDER BY a.fecha DESC, a.id DESC LIMIT ? OFFSET ?`,
    [...valores, porPagina, (pagina - 1) * porPagina],
  );
  // Valores para las listas de los filtros: solo lo que existe en la bitácora
  const [acciones] = await pool.query("SELECT DISTINCT accion FROM auditoria ORDER BY accion");
  const [tablas] = await pool.query("SELECT DISTINCT tabla_afectada FROM auditoria ORDER BY tabla_afectada");
  const [usuarios] = await pool.query(
    "SELECT DISTINCT u.id, u.usuario FROM auditoria a JOIN usuarios u ON u.id = a.usuario_id ORDER BY u.usuario",
  );
  return {
    registros,
    total: Number(total),
    pagina,
    porPagina,
    paginas: Math.max(Math.ceil(Number(total) / porPagina), 1),
    opciones: {
      acciones: acciones.map((fila) => fila.accion),
      tablas: tablas.map((fila) => fila.tabla_afectada),
      usuarios: usuarios.map((fila) => ({ id: fila.id, usuario: fila.usuario })),
    },
  };
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
