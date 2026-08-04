const produccionService = require("../services/produccion.service");

async function listar(req, res) {
  try {
    res.json(await produccionService.listar());
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al listar produccion" });
  }
}

async function crear(req, res) {
  try {
    const { producto, cantidad } = req.body;
    if (!producto || !cantidad) {
      return res.status(400).json({ mensaje: "producto y cantidad son obligatorios" });
    }
    const nuevo = await produccionService.crear(req.body, req.usuario.id);
    res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al crear orden de produccion" });
  }
}

async function cambiarEstado(req, res) {
  try {
    const { estado } = req.body;
    const validos = ["pendiente", "en_proceso", "finalizado", "cancelado"];
    if (!validos.includes(estado)) {
      return res.status(400).json({ mensaje: `estado debe ser uno de: ${validos.join(", ")}` });
    }
    const actualizado = await produccionService.cambiarEstado(req.params.id, estado, req.usuario.id);
    res.json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al cambiar estado de produccion" });
  }
}

async function eliminar(req, res) {
  try {
    await produccionService.eliminar(req.params.id, req.usuario.id);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al eliminar orden de produccion" });
  }
}

module.exports = { listar, crear, cambiarEstado, eliminar };
