const inventarioService = require("../services/inventario.service");

async function listar(req, res) {
  try {
    res.json(await inventarioService.listar());
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al listar inventario" });
  }
}

async function ingresar(req, res) {
  try {
    const { producto, cantidad } = req.body;
    if (!producto || !cantidad) {
      return res.status(400).json({ mensaje: "producto y cantidad son obligatorios" });
    }
    const actualizado = await inventarioService.ingresar(req.body, req.usuario.id);
    res.status(201).json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al ingresar al inventario" });
  }
}

async function salida(req, res) {
  try {
    const { cantidad } = req.body;
    if (!cantidad) return res.status(400).json({ mensaje: "cantidad es obligatoria" });
    const actualizado = await inventarioService.registrarSalida(req.params.id, cantidad, req.usuario.id);
    res.json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: error.message || "Error al registrar salida" });
  }
}

module.exports = { listar, ingresar, salida };
