const materiaPrimaService = require("../services/materiaPrima.service");

async function listar(req, res) {
  try {
    const datos = await materiaPrimaService.listar();
    res.json(datos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al listar materia prima" });
  }
}

async function obtener(req, res) {
  try {
    const item = await materiaPrimaService.obtenerPorId(req.params.id);
    if (!item) return res.status(404).json({ mensaje: "No encontrado" });
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener materia prima" });
  }
}

async function crear(req, res) {
  try {
    const { nombre, tipo, cantidad } = req.body;
    if (!nombre || !tipo || cantidad === undefined) {
      return res.status(400).json({ mensaje: "nombre, tipo y cantidad son obligatorios" });
    }
    const nuevo = await materiaPrimaService.crear(req.body, req.usuario.id);
    res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al crear materia prima" });
  }
}

async function actualizar(req, res) {
  try {
    const actualizado = await materiaPrimaService.actualizar(req.params.id, req.body, req.usuario.id);
    res.json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al actualizar materia prima" });
  }
}

async function eliminar(req, res) {
  try {
    await materiaPrimaService.eliminar(req.params.id, req.usuario.id);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al eliminar materia prima" });
  }
}

async function bajoStock(req, res) {
  try {
    const datos = await materiaPrimaService.listarBajoStock();
    res.json(datos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al consultar stock bajo" });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, bajoStock };
