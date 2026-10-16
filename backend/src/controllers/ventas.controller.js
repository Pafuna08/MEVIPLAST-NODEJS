const ventasService = require("../services/ventas.service");

async function listar(req, res) {
  try {
    res.json(await ventasService.listar());
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al listar ventas" });
  }
}

async function registrar(req, res) {
  try {
    const { cliente, producto, cantidad, precio_unitario } = req.body;
    if (!cliente || !producto || !cantidad || !precio_unitario) {
      return res.status(400).json({ mensaje: "cliente, producto, cantidad y precio_unitario son obligatorios" });
    }
    const venta = await ventasService.registrar(req.body, req.usuario.id);
    res.status(201).json(venta);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: error.message || "Error al registrar la venta" });
  }
}

module.exports = { listar, registrar };
