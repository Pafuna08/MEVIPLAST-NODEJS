const lineasService = require("../services/lineas.service");
const log = require("../utils/logger").crearLogger("lineas");

async function listar(req, res) {
  try {
    res.json(await lineasService.listar());
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res.status(500).json({ mensaje: "Error al listar las líneas de producto" });
  }
}

async function crear(req, res) {
  try {
    const linea = await lineasService.crear(req.body, req.usuario.id);
    res.status(201).json(linea);
  } catch (error) {
    if (!error.statusCode) log.error("Error al atender la petición", { error });
    res
      .status(error.statusCode || 500)
      .json({ mensaje: error.statusCode ? error.message : "Error al crear la línea de producto" });
  }
}

module.exports = { listar, crear };
