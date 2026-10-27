const produccionService = require("../services/produccion.service");
const log = require("../utils/logger").crearLogger("produccion");

async function listar(req, res) {
  try {
    res.json(await produccionService.listar(req.usuario));
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res.status(500).json({ mensaje: "Error al listar produccion" });
  }
}

async function listarOperarios(req, res) {
  try {
    res.json(await produccionService.listarOperarios());
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res.status(500).json({ mensaje: "Error al listar operarios" });
  }
}

async function listarSupervisores(req, res) {
  try {
    res.json(await produccionService.listarSupervisores());
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res.status(500).json({ mensaje: "Error al listar supervisores" });
  }
}

async function listarPlantillas(req, res) {
  try {
    res.json(await produccionService.listarPlantillas());
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res.status(500).json({ mensaje: "Error al listar plantillas de producción" });
  }
}

async function crearPlantilla(req, res) {
  try {
    const { producto, cantidad, prioridad } = req.body;
    if (!producto?.trim() || !Number.isFinite(Number(cantidad)) || Number(cantidad) <= 0) {
      return res.status(400).json({ mensaje: "Producto y cantidad válida son obligatorios" });
    }
    if (prioridad !== undefined && !["baja", "media", "alta"].includes(prioridad)) {
      return res.status(400).json({ mensaje: "La prioridad no es válida" });
    }
    const plantilla = await produccionService.crearPlantilla(
      req.body,
      req.usuario.id,
    );
    res.status(201).json(plantilla);
  } catch (error) {
    log.error("Error al atender la petición", { error });
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "Ya existe una plantilla para ese producto" });
    }
    res.status(500).json({ mensaje: "Error al guardar plantilla de producción" });
  }
}

async function eliminarPlantilla(req, res) {
  try {
    await produccionService.eliminarPlantilla(req.params.id);
    res.status(204).send();
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res.status(500).json({ mensaje: "Error al eliminar plantilla de producción" });
  }
}

async function crear(req, res) {
  try {
    const { producto, cantidad, prioridad } = req.body;
    if (!producto?.trim() || !Number.isFinite(Number(cantidad)) || Number(cantidad) <= 0) {
      return res
        .status(400)
        .json({ mensaje: "producto y cantidad son obligatorios" });
    }
    if (prioridad !== undefined && !["baja", "media", "alta"].includes(prioridad)) {
      return res.status(400).json({ mensaje: "La prioridad no es válida" });
    }
    const nuevo = await produccionService.crear(req.body, req.usuario);
    res.status(201).json(nuevo);
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res.status(400).json({ mensaje: error.message || "Error al crear orden de produccion" });
  }
}

async function asignarOperario(req, res) {
  try {
    const responsableId = Number(req.body.responsable_id);
    if (!Number.isInteger(responsableId) || responsableId <= 0) {
      return res.status(400).json({ mensaje: "Debes seleccionar un operario válido" });
    }
    res.json(
      await produccionService.asignarOperario(
        req.params.id,
        responsableId,
        req.usuario,
      ),
    );
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res.status(400).json({ mensaje: error.message || "Error al asignar operario" });
  }
}

async function cambiarEstado(req, res) {
  try {
    const { estado } = req.body;
    const validos = ["pendiente", "en_proceso", "finalizado", "cancelado"];
    if (!validos.includes(estado)) {
      return res
        .status(400)
        .json({ mensaje: `estado debe ser uno de: ${validos.join(", ")}` });
    }
    const actualizado = await produccionService.cambiarEstado(
      req.params.id,
      estado,
      req.usuario,
    );
    res.json(actualizado);
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res
      .status(400)
      .json({ mensaje: error.message || "Error al cambiar estado de produccion" });
  }
}

async function actualizar(req, res) {
  try {
    const actualizado = await produccionService.actualizarOrden(
      req.params.id,
      req.body,
      req.usuario,
    );
    res.json(actualizado);
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res
      .status(400)
      .json({ mensaje: error.message || "Error al actualizar orden" });
  }
}

async function registrarAvance(req, res) {
  try {
    const cantidad = Number(req.body.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0)
      return res
        .status(400)
        .json({ mensaje: "cantidad debe ser mayor que cero" });
    res.json(
      await produccionService.registrarAvance(
        req.params.id,
        {
          cantidad,
          observaciones: req.body.observaciones,
        },
        req.usuario,
      ),
    );
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res
      .status(400)
      .json({ mensaje: error.message || "Error al registrar avance" });
  }
}

async function eliminar(req, res) {
  try {
    await produccionService.eliminar(req.params.id, req.usuario.id);
    res.status(204).send();
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res.status(500).json({ mensaje: "Error al eliminar orden de produccion" });
  }
}

module.exports = {
  listar,
  listarOperarios,
  listarSupervisores,
  listarPlantillas,
  crearPlantilla,
  eliminarPlantilla,
  crear,
  asignarOperario,
  actualizar,
  cambiarEstado,
  registrarAvance,
  eliminar,
};
