const reportesService = require("../services/reportes.service");
const reportesExcel = require("../services/reportesExcel.service");
const log = require("../utils/logger").crearLogger("reportes");

async function produccion(req, res) {
  try {
    res.json(await reportesService.resumenProduccion());
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res.status(500).json({ mensaje: "Error al generar reporte de produccion" });
  }
}

async function detalleProduccion(req, res) {
  try {
    res.json(await reportesService.detalleProduccion(req.query.periodo));
  } catch (error) {
    if (error.message.startsWith("El periodo")) {
      return res.status(400).json({ mensaje: error.message });
    }
    log.error("Error al atender la petición", { error });
    res.status(500).json({ mensaje: "Error al generar el detalle de producción" });
  }
}

async function detalleVentas(req, res) {
  try {
    res.json(await reportesService.detalleVentas(req.query.periodo));
  } catch (error) {
    if (error.message.startsWith("El periodo")) {
      return res.status(400).json({ mensaje: error.message });
    }
    log.error("Error al atender la petición", { error });
    res.status(500).json({ mensaje: "Error al generar el detalle de ventas" });
  }
}

async function ventas(req, res) {
  try {
    const { desde, hasta } = req.query;
    res.json(await reportesService.resumenVentas({ desde, hasta }));
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res.status(500).json({ mensaje: "Error al generar reporte de ventas" });
  }
}

async function inventario(req, res) {
  try {
    res.json(await reportesService.resumenInventario());
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res.status(500).json({ mensaje: "Error al generar reporte de inventario" });
  }
}

async function auditoria(req, res) {
  try {
    const limite = Number(req.query.limite) || 100;
    res.json(await reportesService.bitacoraAuditoria(limite));
  } catch (error) {
    log.error("Error al atender la petición", { error });
    res.status(500).json({ mensaje: "Error al consultar la bitacora" });
  }
}

// Exporta el detalle del periodo a Excel (RF-028)
function exportarExcel(tipo) {
  return async (req, res) => {
    try {
      const { buffer, nombreArchivo } = await reportesExcel.libroDetalle(tipo, req.query.periodo);
      res.set({
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      });
      res.send(buffer);
    } catch (error) {
      if (error.message.startsWith("El periodo")) {
        return res.status(400).json({ mensaje: error.message });
      }
      log.error("Error al atender la petición", { error });
      res.status(500).json({ mensaje: "Error al exportar el reporte a Excel" });
    }
  };
}

module.exports = {
  produccion,
  detalleProduccion,
  detalleVentas,
  excelProduccion: exportarExcel("produccion"),
  excelVentas: exportarExcel("ventas"),
  ventas,
  inventario,
  auditoria,
};
