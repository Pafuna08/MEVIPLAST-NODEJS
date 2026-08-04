const reportesService = require("../services/reportes.service");

async function produccion(req, res) {
  try {
    res.json(await reportesService.resumenProduccion());
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al generar reporte de produccion" });
  }
}

async function ventas(req, res) {
  try {
    const { desde, hasta } = req.query;
    res.json(await reportesService.resumenVentas({ desde, hasta }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al generar reporte de ventas" });
  }
}

async function inventario(req, res) {
  try {
    res.json(await reportesService.resumenInventario());
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al generar reporte de inventario" });
  }
}

async function auditoria(req, res) {
  try {
    const limite = Number(req.query.limite) || 100;
    res.json(await reportesService.bitacoraAuditoria(limite));
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al consultar la bitacora" });
  }
}

module.exports = { produccion, ventas, inventario, auditoria };
