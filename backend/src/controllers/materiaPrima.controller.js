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
    const { tipo, medida, calibre, color, peso_rollo } = req.body;
    if (!tipo || !medida || !calibre || !color || peso_rollo === undefined) {
      return res
        .status(400)
        .json({ mensaje: "Material, medida, calibre, color y peso del rollo son obligatorios" });
    }
    const nuevo = await materiaPrimaService.crear(req.body, req.usuario.id);
    res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    res
      .status(error.statusCode || 500)
      .json({ mensaje: error.message || "Error al crear materia prima" });
  }
}

async function actualizar(req, res) {
  try {
    const actualizado = await materiaPrimaService.actualizar(
      req.params.id,
      req.body,
      req.usuario.id,
    );
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

async function listarMovimientos(req, res) {
  try {
    res.json(
      await materiaPrimaService.listarMovimientos(req.params.id || null),
    );
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ mensaje: "Error al consultar movimientos de materia prima" });
  }
}

async function registrarMovimiento(req, res) {
  try {
    const { materia_prima_id, tipo, cantidad } = req.body;
    if (!materia_prima_id || !tipo || cantidad === undefined) {
      return res
        .status(400)
        .json({
          mensaje: "materia_prima_id, tipo y cantidad son obligatorios",
        });
    }
    const rolesPorTipo = {
      compra: ["admin", "almacenista"],
      ajuste_entrada: ["admin", "almacenista"],
      ajuste_salida: ["admin", "almacenista"],
      consumo_produccion: ["admin", "supervisor"],
    };
    if (!rolesPorTipo[tipo]?.includes(req.usuario.rol)) {
      return res
        .status(403)
        .json({ mensaje: "Tu rol no puede registrar este tipo de movimiento" });
    }
    const resultado = await materiaPrimaService.registrarMovimiento(
      materia_prima_id,
      req.body,
      req.usuario,
    );
    res.status(201).json(resultado);
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ mensaje: error.message || "Error al registrar movimiento" });
  }
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
  bajoStock,
  listarMovimientos,
  registrarMovimiento,
};
