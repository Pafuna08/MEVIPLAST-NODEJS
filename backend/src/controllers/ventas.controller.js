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

module.exports = { listar, registrar };
