const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");
const { productosTerminados } = require("../constants/productosTerminados");
const { LIMITES, entero, decimal, leerNumero, errorDeDato, miles } = require("../utils/numeros");

async function listar(actor) {
  const condicion = actor?.rol === "vendedor" ? "WHERE v.usuario_id = ?" : "";
  const valores = actor?.rol === "vendedor" ? [actor.id] : [];
  const [filas] = await pool.query(
    `SELECT v.*, i.familia, i.medida, i.calibre, i.color, u.nombre AS vendedor
     FROM ventas v
     LEFT JOIN inventario i ON i.id = v.inventario_id
     LEFT JOIN usuarios u ON u.id = v.usuario_id
     ${condicion} ORDER BY v.fecha DESC`,
    valores,
  );
  return filas;
}

async function obtenerPorId(id) {
  const [filas] = await pool.query("SELECT * FROM ventas WHERE id = ?", [id]);
  return filas[0] || null;
}

// Datos del comprobante imprimible (RF-023). El vendedor solo ve los de sus ventas.
async function obtenerComprobante(id, actor) {
  const soloPropias = actor?.rol === "vendedor";
  const [filas] = await pool.query(
    `SELECT v.id, v.cliente, v.producto, v.cantidad, v.cantidad_paquetes, v.unidades_paquete,
            v.precio_paquete, v.precio_unitario, v.total, v.fecha,
            i.familia, i.medida, i.calibre, i.color, u.nombre AS vendedor
     FROM ventas v
     LEFT JOIN inventario i ON i.id = v.inventario_id
     LEFT JOIN usuarios u ON u.id = v.usuario_id
     WHERE v.id = ?${soloPropias ? " AND v.usuario_id = ?" : ""}`,
    soloPropias ? [id, actor.id] : [id],
  );
  if (!filas[0]) return null;
  return { ...filas[0], numero: `V-${String(filas[0].id).padStart(6, "0")}` };
}

async function registrar(
  { cliente, inventario_id, cantidad_paquetes, unidades_paquete, precio_paquete },
  actorId,
) {
  // CR-018: paquetes de 50, 100 o 500 unidades, hasta 1 000 paquetes y hasta 100 millones de pesos por venta
  const cantidadPaquetes = entero(cantidad_paquetes, "La cantidad de paquetes", LIMITES.PAQUETES_MAX);
  const unidadesPaquete = leerNumero(unidades_paquete);
  if (!LIMITES.UNIDADES_POR_PAQUETE.includes(unidadesPaquete)) {
    throw errorDeDato("El paquete debe ser de 50, 100 o 500 unidades");
  }
  const precioPaquete = decimal(precio_paquete, "El precio por paquete", LIMITES.VENTA_MAX, { prefijo: "$" });
  if (cantidadPaquetes * precioPaquete > LIMITES.VENTA_MAX) {
    throw errorDeDato("El total de la venta admite como máximo $" + miles(LIMITES.VENTA_MAX));
  }
  const cantidadUnidades = cantidadPaquetes * unidadesPaquete;
  const precioUnitario = precioPaquete / unidadesPaquete;

  const connection = await pool.getConnection();
  let saleId;
  let productoNombre;
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [inventario] = await connection.query(
      "SELECT id, producto, familia, cantidad FROM inventario WHERE id = ? FOR UPDATE",
      [inventario_id],
    );
    if (inventario.length === 0 || !productosTerminados.includes(inventario[0].familia)) {
      throw new Error("Selecciona una variante de producto válida");
    }
    productoNombre = inventario[0].producto;
    if (Number(inventario[0].cantidad) < cantidadUnidades) {
      throw new Error("Stock insuficiente en inventario para esta venta");
    }

    const [resultado] = await connection.query(
      "INSERT INTO ventas (cliente, producto, cantidad, precio_unitario, inventario_id, cantidad_paquetes, unidades_paquete, precio_paquete, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [cliente, inventario[0].producto, cantidadUnidades, precioUnitario, inventario[0].id, cantidadPaquetes, unidadesPaquete, precioPaquete, actorId],
    );
    await connection.query(
      "UPDATE inventario SET cantidad = cantidad - ? WHERE id = ? AND cantidad >= ?",
      [cantidadUnidades, inventario[0].id, cantidadUnidades],
    );
    await connection.query(
      "INSERT INTO movimientos_inventario (inventario_id, usuario_id, venta_id, tipo, cantidad) VALUES (?, ?, ?, 'venta', ?)",
      [inventario[0].id, actorId, resultado.insertId, cantidadUnidades],
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
    detalle: `Salida de ${cantidadUnidades} unidades de '${productoNombre}'`,
  });

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "REGISTRAR_VENTA",
    tabla: "ventas",
    detalle: `Venta de ${cantidadPaquetes} paquetes de ${productoNombre} a '${cliente}'`,
  });

  return obtenerPorId(saleId);
}

module.exports = { listar, obtenerPorId, obtenerComprobante, registrar };
