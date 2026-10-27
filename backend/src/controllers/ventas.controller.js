const ventasService = require("../services/ventas.service");

async function listar(req, res) {
  try {
    res.json(await ventasService.listar(req.usuario));
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al listar ventas" });
  }
}

async function registrar(req, res) {
  try {
    const { cliente, inventario_id, cantidad_paquetes, unidades_paquete, precio_paquete } = req.body;
    if (!cliente || !inventario_id || !cantidad_paquetes || !unidades_paquete || !precio_paquete) {
      return res
        .status(400)
        .json({
          mensaje: "cliente, variante, paquetes, unidades por paquete y precio por paquete son obligatorios",
        });
    }
    const venta = await ventasService.registrar(req.body, req.usuario.id);
    res.status(201).json(venta);
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ mensaje: error.message || "Error al registrar la venta" });
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
    console.error(error);
    res.status(500).json({ mensaje: "Error al generar el comprobante" });
  }
}

module.exports = { listar, registrar, comprobante };
