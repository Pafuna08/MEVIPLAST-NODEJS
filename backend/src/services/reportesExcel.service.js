const ExcelJS = require("exceljs");
const reportesService = require("./reportes.service");

const FORMATO_DINERO = '"$" #,##0';
const FORMATO_UNIDADES = "#,##0";
const FORMATO_FECHA = "dd/mm/yyyy hh:mm";

// Columnas de cada reporte: [encabezado, campo, ancho, formato]
const COLUMNAS = {
  produccion: {
    titulo: "Producción",
    porProducto: [["Producto", "producto", 40], ["Unidades producidas", "unidades", 20, FORMATO_UNIDADES]],
    detalle: [
      ["Fecha", "fecha", 18, FORMATO_FECHA],
      ["Producto", "producto", 40],
      ["Orden", "orden_id", 10],
      ["Operario", "operario", 28],
      ["Cantidad", "cantidad", 14, FORMATO_UNIDADES],
    ],
    resumen: (r) => [["Registros de producción", r.movimientos, FORMATO_UNIDADES], ["Unidades producidas", r.unidades, FORMATO_UNIDADES]],
  },
  ventas: {
    titulo: "Ventas",
    porProducto: [["Producto", "producto", 40], ["Unidades", "unidades", 14, FORMATO_UNIDADES], ["Total vendido", "total", 18, FORMATO_DINERO]],
    detalle: [
      ["Fecha", "fecha", 18, FORMATO_FECHA],
      ["Cliente", "cliente", 32],
      ["Producto", "producto", 40],
      ["Cantidad", "cantidad", 12, FORMATO_UNIDADES],
      ["Precio unitario", "precio_unitario", 16, FORMATO_DINERO],
      ["Total", "total", 16, FORMATO_DINERO],
    ],
    resumen: (r) => [["Número de ventas", r.numero_ventas, FORMATO_UNIDADES], ["Unidades vendidas", r.unidades, FORMATO_UNIDADES], ["Total vendido", r.total_vendido, FORMATO_DINERO]],
  },
};

// Excel no maneja zonas horarias y exceljs escribe la fecha en UTC: se corre a la
// hora local del servidor para que la celda muestre la misma hora que el panel.
function fechaLocal(valor) {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
}

// mysql2 devuelve DECIMAL como texto y DATETIME como Date
function valorCelda(valor, formato) {
  if (valor === null || valor === undefined) return null;
  if (formato === FORMATO_FECHA) return fechaLocal(valor);
  if (formato) return Number(valor);
  return valor;
}

function hojaTabla(libro, nombre, columnas, filas) {
  const hoja = libro.addWorksheet(nombre, { views: [{ state: "frozen", ySplit: 1 }] });
  hoja.columns = columnas.map(([header, key, width, numFmt]) => ({ header, key, width, style: numFmt ? { numFmt } : {} }));
  hoja.getRow(1).font = { bold: true };
  for (const fila of filas) {
    hoja.addRow(Object.fromEntries(columnas.map(([, key, , numFmt]) => [key, valorCelda(fila[key], numFmt)])));
  }
  if (filas.length) hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
  return hoja;
}

async function libroDetalle(tipo, periodo, ahora = new Date()) {
  const config = COLUMNAS[tipo];
  if (!config) throw new Error("El reporte debe ser de producción o de ventas");
  const datos = tipo === "produccion"
    ? await reportesService.detalleProduccion(periodo, ahora)
    : await reportesService.detalleVentas(periodo, ahora);

  const libro = new ExcelJS.Workbook();
  libro.creator = "MEVIPLAST";
  libro.created = ahora;

  const resumen = libro.addWorksheet("Resumen");
  resumen.columns = [{ width: 26 }, { width: 22 }];
  resumen.addRow([`Reporte de ${config.titulo.toLowerCase()} ${periodo}`]).font = { bold: true, size: 14 };
  resumen.addRow(["Desde", datos.desde]);
  resumen.addRow(["Hasta", datos.hastaInclusivo]);
  resumen.addRow(["Generado", fechaLocal(ahora)]).getCell(2).numFmt = FORMATO_FECHA;
  resumen.addRow([]);
  for (const [etiqueta, valor, numFmt] of config.resumen(datos.resumen)) {
    resumen.addRow([etiqueta, Number(valor || 0)]).getCell(2).numFmt = numFmt;
  }

  hojaTabla(libro, "Por producto", config.porProducto, datos.porProducto);
  hojaTabla(libro, "Detalle", config.detalle, datos.detalle);

  return {
    buffer: Buffer.from(await libro.xlsx.writeBuffer()),
    nombreArchivo: `reporte-${tipo}-${periodo}-${datos.desde}.xlsx`,
  };
}

module.exports = { libroDetalle };
