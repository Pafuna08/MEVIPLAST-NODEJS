const inventarioService = require("../services/inventario.service");
const log = require("../utils/logger").crearLogger("inventario");

async function listar(req, res) {
  try {
    res.json(await inventarioService.listar());
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res.status(500).json({ mensaje: "Error al listar inventario" });
  }
}

async function ingresar(req, res) {
  try {
    const { familia, medida, calibre, color, cantidad } = req.body;
    if (!familia || !medida || !calibre || !color || !cantidad) {
      return res
        .status(400)
        .json({ mensaje: "Línea, medida, calibre, color y unidades son obligatorios" });
    }
    const actualizado = await inventarioService.ingresar(
      req.body,
      req.usuario.id,
    );
    res.status(201).json(actualizado);
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res
      .status(error.statusCode || 500)
      .json({ mensaje: error.message || "Error al ingresar al inventario" });
  }
}

async function salida(req, res) {
  try {
    const { cantidad, motivo, detalle } = req.body;
    if (!cantidad || !motivo)
      return res.status(400).json({ mensaje: "cantidad y motivo son obligatorios" });
    const actualizado = await inventarioService.registrarSalida(
      req.params.id,
      cantidad,
      req.usuario.id,
      { motivo, detalle },
    );
    res.json(actualizado);
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res
      .status(400)
      .json({ mensaje: error.message || "Error al registrar salida" });
  }
}

async function movimientos(req, res) {
  try {
    res.json(await inventarioService.listarMovimientos(req.params.id || null));
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res
      .status(500)
      .json({ mensaje: "Error al consultar movimientos de inventario" });
  }
}

module.exports = { listar, ingresar, salida, movimientos };
