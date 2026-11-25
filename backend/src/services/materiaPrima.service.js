const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");
const { normalizarCalibre, normalizarColor, normalizarTamanoRollo } = require("../utils/variantes");
const { LIMITES, decimal, errorDeDato } = require("../utils/numeros");

const tiposEntrada = new Set(["compra", "ajuste_entrada"]);
const tiposPermitidos = new Set([
  ...tiposEntrada,
  "ajuste_salida",
  "consumo_produccion",
]);
const materialesPermitidos = {
  PEBD: "Bobina o rollo de polietileno de baja densidad (PEBD)",
  PEAD: "Bobina o rollo de polietileno de alta densidad (PEAD)",
  PP: "Bobina o rollo de polipropileno (PP)",
};

function validarCampoMaterial(valor, campo, maxLength) {
  if (
    typeof valor !== "string" ||
    !valor.trim() ||
    valor.trim().length > maxLength
  ) {
    const error = new Error(`${campo} es obligatorio y no debe exceder ${maxLength} caracteres`);
    error.statusCode = 400;
    throw error;
  }
  return valor.trim();
}

function nombreMaterial(tipo, medida, calibre, color) {
  return `${materialesPermitidos[tipo]} - ${medida} - calibre ${calibre} - ${color}`;
}

async function listar() {
  const [filas] = await pool.query(
    "SELECT * FROM materia_prima ORDER BY fecha_ingreso DESC",
  );
  return filas;
}

async function obtenerPorId(id) {
  const [filas] = await pool.query("SELECT * FROM materia_prima WHERE id = ?", [
    id,
  ]);
  return filas[0] || null;
}

async function crear(datos, actorId) {
  const { tipo, peso_rollo } = datos;
  const nombre = materialesPermitidos[tipo];
  if (!nombre) {
    const error = new Error("Selecciona un material válido");
    error.statusCode = 400;
    throw error;
  }
  // Obligatorios y dentro del largo de la columna; luego el formato de RN-025
  // MEVI-115: tamaño del rollo con su unidad de medida (pulgadas o centímetros), en lugar de ancho x largo
  const medida = normalizarTamanoRollo(datos.tamano_rollo, datos.unidad_medida);
  const calibre = normalizarCalibre(validarCampoMaterial(datos.calibre, "El calibre", 40));
  const color = normalizarColor(validarCampoMaterial(datos.color, "El color", 80));
  const nombreCompleto = nombreMaterial(tipo, medida, calibre, color);
  if (nombreCompleto.length > 120) {
    const error = new Error("Las especificaciones exceden el largo permitido");
    error.statusCode = 400;
    throw error;
  }
  const pesoRollo = decimal(peso_rollo, "El peso del rollo", LIMITES.KG_MAX);

  const connection = await pool.getConnection();
  let id;
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    // Una sola bobina por variante: si ya existe, su existencia sube con una compra (DEF-022)
    const [repetidas] = await connection.query(
      "SELECT id FROM materia_prima WHERE tipo = ? AND medida = ? AND calibre = ? AND color = ? LIMIT 1 FOR UPDATE",
      [tipo, medida, calibre, color],
    );
    if (repetidas.length) {
      const error = new Error("Esa bobina ya está registrada; para aumentar su existencia registra una compra");
      error.statusCode = 409;
      throw error;
    }
    const [resultado] = await connection.query(
      "INSERT INTO materia_prima (nombre, tipo, medida, calibre, color, peso_rollo, cantidad, unidad, proveedor, stock_minimo) VALUES (?, ?, ?, ?, ?, ?, ?, 'kg', NULL, 0)",
      [
        nombreCompleto,
        tipo,
        medida,
        calibre,
        color,
        pesoRollo,
        pesoRollo,
      ],
    );
    id = resultado.insertId;
    await connection.query(
      "INSERT INTO movimientos_materia_prima (materia_prima_id, usuario_id, tipo, cantidad, observaciones) VALUES (?, ?, 'ajuste_entrada', ?, ?)",
      [id, actorId, pesoRollo, "Peso inicial del rollo al registrar materia prima"],
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
    accion: "CREAR_MATERIA_PRIMA",
    tabla: "materia_prima",
    detalle: `Ingreso de '${nombreCompleto}', peso ${pesoRollo} kg`,
  });

  return obtenerPorId(id);
}

async function actualizar(id, datos, actorId) {
  const { nombre, tipo, cantidad, unidad, proveedor, stock_minimo } = datos;
  if (cantidad !== undefined) {
    const error = new Error("Actualiza las cantidades mediante una compra, consumo o ajuste de inventario");
    error.statusCode = 400;
    throw error;
  }
  if (tipo !== undefined && !materialesPermitidos[tipo]) {
    const error = new Error("Selecciona un material válido");
    error.statusCode = 400;
    throw error;
  }
  const stockMinimo = stock_minimo === undefined || stock_minimo === null || stock_minimo === ""
    ? null
    : decimal(stock_minimo, "El stock mínimo", LIMITES.KG_MAX, { permitirCero: true });
  const [resultado] = await pool.query(
    `UPDATE materia_prima SET
      nombre = COALESCE(?, nombre),
      tipo = COALESCE(?, tipo),
      unidad = COALESCE(?, unidad),
      proveedor = COALESCE(?, proveedor),
      stock_minimo = COALESCE(?, stock_minimo)
     WHERE id = ?`,
    [nombre, tipo, unidad, proveedor, stockMinimo, id],
  );
  if (!resultado.affectedRows) {
    const error = new Error("Materia prima no encontrada");
    error.statusCode = 404;
    throw error;
  }

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "ACTUALIZAR_MATERIA_PRIMA",
    tabla: "materia_prima",
    detalle: `Actualizacion de materia prima con id ${id}`,
  });

  return obtenerPorId(id);
}

async function eliminar(id, actorId) {
  await pool.query("DELETE FROM materia_prima WHERE id = ?", [id]);

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "ELIMINAR_MATERIA_PRIMA",
    tabla: "materia_prima",
    detalle: `Eliminacion de materia prima con id ${id}`,
  });
}

async function listarBajoStock() {
  const [filas] = await pool.query(
    "SELECT * FROM materia_prima WHERE cantidad <= stock_minimo",
  );
  return filas;
}

async function listarMovimientos(materiaPrimaId) {
  const condiciones = materiaPrimaId ? "WHERE m.materia_prima_id = ?" : "";
  const valores = materiaPrimaId ? [materiaPrimaId] : [];
  const [filas] = await pool.query(
    `SELECT m.*, mp.nombre AS materia_prima, u.nombre AS registrado_por,
            p.producto AS producto_produccion
     FROM movimientos_materia_prima m
     JOIN materia_prima mp ON mp.id = m.materia_prima_id
     LEFT JOIN usuarios u ON u.id = m.usuario_id
     LEFT JOIN produccion p ON p.id = m.produccion_id
     ${condiciones}
     ORDER BY m.fecha DESC, m.id DESC`,
    valores,
  );
  return filas;
}

// HU-010 / RF-015: una compra puede llevar su costo total (pesos) y el número de factura del proveedor.
// Los dos son opcionales y solo valen para compras.
const FORMATO_FACTURA = /^[A-Za-z0-9][A-Za-z0-9 ./-]{0,39}$/;
function datosCompra(tipo, costo, factura) {
  const vacio = (valor) => valor === undefined || valor === null || valor === "";
  if (tipo !== "compra") {
    if (!vacio(costo) || !vacio(factura)) throw errorDeDato("El costo y la factura solo se registran en las compras");
    return { costo: null, factura: null };
  }
  const costoNumerico = vacio(costo) ? null : decimal(costo, "El costo", LIMITES.VENTA_MAX, { prefijo: "$" });
  let numeroFactura = null;
  if (!vacio(factura)) {
    numeroFactura = typeof factura === "string" ? factura.trim() : "";
    if (!FORMATO_FACTURA.test(numeroFactura)) {
      throw errorDeDato("El número de factura admite hasta 40 letras, números, espacios, punto, guion o barra");
    }
  }
  return { costo: costoNumerico, factura: numeroFactura };
}

async function registrarMovimiento(
  id,
  { tipo, cantidad, observaciones, produccion_id, costo, factura },
  actor,
) {
  if (!tiposPermitidos.has(tipo))
    throw new Error("Tipo de movimiento no válido");
  const cantidadNumerica = decimal(cantidad, "La cantidad", LIMITES.KG_MAX);
  const compra = datosCompra(tipo, costo, factura);

  const connection = await pool.getConnection();
  let transactionStarted = false;
  let movimientoId;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [materiales] = await connection.query(
      "SELECT id, cantidad FROM materia_prima WHERE id = ? FOR UPDATE",
      [id],
    );
    if (!materiales.length) throw new Error("Materia prima no encontrada");

    let produccionId = null;
    if (tipo === "consumo_produccion") {
      if (!produccion_id)
        throw new Error("El consumo debe asociarse a una orden");
      const [ordenes] = await connection.query(
        "SELECT id, materia_prima_id, estado, supervisor_id FROM produccion WHERE id = ? FOR UPDATE",
        [produccion_id],
      );
      const orden = ordenes[0];
      if (!orden || Number(orden.materia_prima_id) !== Number(id)) {
        throw new Error("La materia prima no está asociada a esa orden");
      }
      // Mismo alcance que /api/produccion: el supervisor solo trabaja con sus órdenes o las sin asignar
      if (actor?.rol === "supervisor" && orden.supervisor_id != null && Number(orden.supervisor_id) !== Number(actor.id)) {
        throw new Error("La orden pertenece a otro supervisor");
      }
      if (["cancelado", "finalizado"].includes(orden.estado)) {
        throw new Error("La orden no admite más consumos");
      }
      produccionId = orden.id;
    }

    const delta = tiposEntrada.has(tipo) ? cantidadNumerica : -cantidadNumerica;
    if (delta < 0 && Number(materiales[0].cantidad) < cantidadNumerica) {
      throw new Error("Stock insuficiente de materia prima");
    }
    await connection.query(
      "UPDATE materia_prima SET cantidad = cantidad + ? WHERE id = ?",
      [delta, id],
    );
    const [resultado] = await connection.query(
      "INSERT INTO movimientos_materia_prima (materia_prima_id, usuario_id, produccion_id, tipo, cantidad, costo, factura, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        actor.id,
        produccionId,
        tipo,
        cantidadNumerica,
        compra.costo,
        compra.factura,
        observaciones || null,
      ],
    );
    movimientoId = resultado.insertId;
    await connection.commit();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await registrarAuditoria({
    usuarioId: actor.id,
    accion: tipo.toUpperCase(),
    tabla: "materia_prima",
    detalle: `Movimiento ${movimientoId} por ${cantidadNumerica} unidades en material ${id}${compra.factura ? ` (factura ${compra.factura})` : ""}`,
  });
  return { material: await obtenerPorId(id), movimientoId };
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarBajoStock,
  listarMovimientos,
  registrarMovimiento,
};
