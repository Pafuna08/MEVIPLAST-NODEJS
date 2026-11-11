const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");
const lineasService = require("./lineas.service");
const { LIMITES, entero, decimal, leerNumero, errorDeDato, miles } = require("../utils/numeros");

// CR-022: una venta tiene encabezado (cliente, vendedor, fecha, total) y una o varias líneas
const MAX_LINEAS = 20;

const numeroVenta = (id) => `V-${String(id).padStart(6, "0")}`;

// Líneas de varias ventas, con la variante del inventario, agrupadas por venta
async function lineasDe(ids) {
  if (!ids.length) return new Map();
  const [filas] = await pool.query(
    `SELECT d.id, d.venta_id, d.inventario_id, d.producto, d.cantidad, d.cantidad_paquetes, d.unidades_paquete,
            d.precio_paquete, d.precio_unitario, d.total, i.familia, i.medida, i.calibre, i.color
     FROM ventas_detalle d
     LEFT JOIN inventario i ON i.id = d.inventario_id
     WHERE d.venta_id IN (?)
     ORDER BY d.venta_id, d.id`,
    [ids],
  );
  const porVenta = new Map(ids.map((id) => [Number(id), []]));
  for (const fila of filas) porVenta.get(Number(fila.venta_id))?.push(fila);
  return porVenta;
}

// Encabezados con sus líneas. El vendedor solo ve sus ventas.
async function listar(actor) {
  const soloPropias = actor?.rol === "vendedor";
  const [ventas] = await pool.query(
    `SELECT v.id, v.cliente, v.total, v.fecha, v.usuario_id, u.nombre AS vendedor
     FROM ventas v
     LEFT JOIN usuarios u ON u.id = v.usuario_id
     ${soloPropias ? "WHERE v.usuario_id = ?" : ""} ORDER BY v.fecha DESC, v.id DESC`,
    soloPropias ? [actor.id] : [],
  );
  const lineas = await lineasDe(ventas.map((venta) => venta.id));
  return ventas.map((venta) => {
    const items = lineas.get(Number(venta.id)) || [];
    return {
      ...venta,
      numero: numeroVenta(venta.id),
      items,
      unidades: items.reduce((suma, item) => suma + Number(item.cantidad), 0),
    };
  });
}

// Datos del comprobante imprimible (RF-023), con todas las líneas. El vendedor solo ve los de sus ventas.
async function obtenerComprobante(id, actor) {
  const soloPropias = actor?.rol === "vendedor";
  const [filas] = await pool.query(
    `SELECT v.id, v.cliente, v.total, v.fecha, u.nombre AS vendedor
     FROM ventas v
     LEFT JOIN usuarios u ON u.id = v.usuario_id
     WHERE v.id = ?${soloPropias ? " AND v.usuario_id = ?" : ""}`,
    soloPropias ? [id, actor.id] : [id],
  );
  if (!filas[0]) return null;
  const items = (await lineasDe([filas[0].id])).get(Number(filas[0].id)) || [];
  return { ...filas[0], numero: numeroVenta(filas[0].id), items };
}

const obtenerPorId = (id) => obtenerComprobante(id, null);

// Una línea: paquetes de 50, 100 o 500 unidades (CR-018), hasta 1 000 paquetes y precio > 0
function leerLinea(item, posicion, varias) {
  const prefijo = varias ? `Producto ${posicion}: ` : "";
  const conPrefijo = (fn) => {
    try {
      return fn();
    } catch (error) {
      error.message = prefijo + error.message;
      throw error;
    }
  };
  if (!item || typeof item !== "object") throw errorDeDato(`${prefijo}Selecciona una variante de producto válida`);
  const inventarioId = leerNumero(item.inventario_id);
  if (!Number.isInteger(inventarioId) || inventarioId <= 0) throw errorDeDato(`${prefijo}Selecciona una variante de producto válida`);
  const cantidadPaquetes = conPrefijo(() => entero(item.cantidad_paquetes, "La cantidad de paquetes", LIMITES.PAQUETES_MAX));
  const unidadesPaquete = leerNumero(item.unidades_paquete);
  if (!LIMITES.UNIDADES_POR_PAQUETE.includes(unidadesPaquete)) {
    throw errorDeDato(`${prefijo}El paquete debe ser de 50, 100 o 500 unidades`);
  }
  const precioPaquete = conPrefijo(() => decimal(item.precio_paquete, "El precio por paquete", LIMITES.VENTA_MAX, { prefijo: "$" }));
  return {
    posicion,
    inventarioId,
    cantidadPaquetes,
    unidadesPaquete,
    precioPaquete,
    unidades: cantidadPaquetes * unidadesPaquete,
    precioUnitario: precioPaquete / unidadesPaquete,
    total: cantidadPaquetes * precioPaquete,
  };
}

function leerVenta(datos) {
  const cliente = typeof datos?.cliente === "string" ? datos.cliente.trim() : "";
  if (!cliente) throw errorDeDato("El cliente es obligatorio");
  if (cliente.length > 120) throw errorDeDato("El cliente admite máximo 120 caracteres");
  // Formato anterior (un solo producto en el cuerpo) o «items» con varias líneas
  const items = Array.isArray(datos.items) ? datos.items : datos.inventario_id !== undefined ? [datos] : [];
  if (!items.length) throw errorDeDato("Agrega al menos un producto a la venta");
  if (items.length > MAX_LINEAS) throw errorDeDato(`Una venta admite como máximo ${MAX_LINEAS} productos`);
  const lineas = items.map((item, i) => leerLinea(item, i + 1, items.length > 1));
  const vistas = new Set();
  for (const linea of lineas) {
    if (vistas.has(linea.inventarioId)) {
      throw errorDeDato(`Producto ${linea.posicion}: esa referencia ya está en la venta; súmala en una sola línea`);
    }
    vistas.add(linea.inventarioId);
  }
  const total = lineas.reduce((suma, linea) => suma + linea.total, 0);
  if (total > LIMITES.VENTA_MAX) {
    throw errorDeDato("El total de la venta admite como máximo $" + miles(LIMITES.VENTA_MAX));
  }
  return { cliente, lineas, total };
}

async function registrar(datos, actorId) {
  const { cliente, lineas, total } = leerVenta(datos);

  const connection = await pool.getConnection();
  let saleId;
  const vendidas = [];
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;

    // Se bloquean las variantes en el mismo orden en todas las ventas, para no cruzarse con otra
    const ids = [...new Set(lineas.map((linea) => linea.inventarioId))].sort((a, b) => a - b);
    const [inventario] = await connection.query(
      "SELECT id, producto, familia, cantidad FROM inventario WHERE id IN (?) ORDER BY id FOR UPDATE",
      [ids],
    );
    const porId = new Map(inventario.map((fila) => [Number(fila.id), fila]));
    for (const linea of lineas) {
      const variante = porId.get(linea.inventarioId);
      const prefijo = lineas.length > 1 ? `Producto ${linea.posicion}: ` : "";
      if (!variante || !(await lineasService.paraValidar(variante.familia)).includes(variante.familia)) {
        throw errorDeDato(`${prefijo}Selecciona una variante de producto válida`);
      }
      if (Number(variante.cantidad) < linea.unidades) {
        throw errorDeDato(lineas.length > 1
          ? `${prefijo}stock insuficiente de ${variante.producto} (hay ${miles(Number(variante.cantidad))} unidades)`
          : "Stock insuficiente en inventario para esta venta");
      }
      vendidas.push({ ...linea, producto: variante.producto });
    }

    const [resultado] = await connection.query(
      "INSERT INTO ventas (cliente, total, usuario_id) VALUES (?, ?, ?)",
      [cliente, total, actorId],
    );
    saleId = resultado.insertId;
    for (const linea of vendidas) {
      await connection.query(
        "INSERT INTO ventas_detalle (venta_id, inventario_id, producto, cantidad, precio_unitario, cantidad_paquetes, unidades_paquete, precio_paquete) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [saleId, linea.inventarioId, linea.producto, linea.unidades, linea.precioUnitario, linea.cantidadPaquetes, linea.unidadesPaquete, linea.precioPaquete],
      );
      await connection.query(
        "UPDATE inventario SET cantidad = cantidad - ? WHERE id = ? AND cantidad >= ?",
        [linea.unidades, linea.inventarioId, linea.unidades],
      );
      await connection.query(
        "INSERT INTO movimientos_inventario (inventario_id, usuario_id, venta_id, tipo, cantidad) VALUES (?, ?, ?, 'venta', ?)",
        [linea.inventarioId, actorId, saleId, linea.unidades],
      );
    }
    await connection.commit();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  for (const linea of vendidas) {
    await registrarAuditoria({
      usuarioId: actorId,
      accion: "SALIDA_INVENTARIO",
      tabla: "inventario",
      detalle: `Salida de ${linea.unidades} unidades de '${linea.producto}' (venta ${numeroVenta(saleId)})`,
    });
  }
  await registrarAuditoria({
    usuarioId: actorId,
    accion: "REGISTRAR_VENTA",
    tabla: "ventas",
    detalle: vendidas.length === 1
      ? `Venta ${numeroVenta(saleId)}: ${vendidas[0].cantidadPaquetes} paquetes de ${vendidas[0].producto} a '${cliente}'`
      : `Venta ${numeroVenta(saleId)}: ${vendidas.length} productos a '${cliente}' por $${miles(total)}`,
  });

  return obtenerPorId(saleId);
}

module.exports = { listar, obtenerPorId, obtenerComprobante, registrar, MAX_LINEAS };
