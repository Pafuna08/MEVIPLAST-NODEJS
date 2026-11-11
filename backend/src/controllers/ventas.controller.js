const ventasService = require("../services/ventas.service");
const log = require("../utils/logger").crearLogger("ventas");

async function listar(req, res) {
  try {
    res.json(await ventasService.listar(req.usuario));
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res.status(500).json({ mensaje: "Error al listar ventas" });
  }
}

async function registrar(req, res) {
  try {
    // CR-022: { cliente, items: [{ inventario_id, cantidad_paquetes, unidades_paquete, precio_paquete }] };
    // también acepta el formato anterior, con un solo producto en el cuerpo
    const { cliente, items, inventario_id } = req.body || {};
    if (!cliente || (!Array.isArray(items) && !inventario_id)) {
      return res
        .status(400)
        .json({ mensaje: "El cliente y al menos un producto (variante, paquetes, unidades por paquete y precio) son obligatorios" });
    }
    const venta = await ventasService.registrar(req.body, req.usuario.id);
    res.status(201).json(venta);
  } catch (error) {
    if (!error.statusCode) log.error("Error al atender la petición", { error });
    res
      .status(error.statusCode || 500)
      .json({ mensaje: error.statusCode ? error.message : "Error al registrar la venta" });
  }
}

async function comprobante(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ mensaje: "Identificador de venta inválido" });
  }
  try {
    const venta = await ventasService.obtenerComprobante(id, req.usuario);
    if (!venta) return res.status(404).json({ mensaje: "Venta no encontrada" });
    res.json(venta);
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res.status(500).json({ mensaje: "Error al generar el comprobante" });
  }
}

module.exports = { listar, registrar, comprobante };
