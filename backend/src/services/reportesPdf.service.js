const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { COLUMNAS, FORMATOS, cargarDatos } = require("./reportesExcel.service");

// Reporte detallado en PDF (RF-028): las mismas columnas y datos que el Excel, para abrirlo en una
// pestaña e imprimirlo o descargarlo con el visor del navegador.
const LOGO = path.join(__dirname, "..", "..", "..", "frontend", "assets", "logo-meviplast.png");
const AZUL = "#0b2545";
const ROJO = "#d02c3a";
const GRIS = "#5f6e81";
const LINEA = "#dde3ea";
const FONDO = "#f4f6f8";

const dinero = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const numero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const porcentaje = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const fechaCorta = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" });
const fechaLarga = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeStyle: "short" });

// Títulos de las tablas de cada reporte (las del Excel son nombres de hoja)
const TITULOS = {
  porProducto: "Resumen por producto",
  detalle: { produccion: "Registros de producción", ventas: "Detalle de ventas" },
  operarios: "Cumplimiento por operario",
};

// Ancho fijo (puntos) de las columnas cortas; las de texto se reparten el resto según su ancho en el Excel
const ANCHOS_FIJOS = {
  fecha: 108,
  numero: 64,
  orden_id: 52,
  cantidad: 62,
  precio_unitario: 84,
  total: 88,
  unidades: 130,
  ordenes: 62,
  finalizadas: 72,
  meta: 70,
  producido: 74,
  cumplimiento: 96,
  unidades_periodo: 190,
};

function anchosColumnas(columnas, ancho) {
  const fijos = columnas.reduce((suma, [, clave]) => suma + (ANCHOS_FIJOS[clave] || 0), 0);
  const libres = columnas.filter(([, clave]) => !ANCHOS_FIJOS[clave]);
  const pesoLibre = libres.reduce((suma, [, , w]) => suma + w, 0);
  const sobrante = Math.max(ancho - fijos, 0);
  return columnas.map(([, clave, w]) => ANCHOS_FIJOS[clave] || (pesoLibre ? (w / pesoLibre) * sobrante : 0));
}

function texto(valor, formato, campo) {
  if (valor === null || valor === undefined || valor === "") return formato === FORMATOS.PORCENTAJE ? "Sin órdenes" : "—";
  if (formato === FORMATOS.DINERO) return dinero.format(Number(valor));
  if (formato === FORMATOS.UNIDADES) return numero.format(Number(valor));
  if (formato === FORMATOS.PORCENTAJE) return `${porcentaje.format(Number(valor))} %`;
  if (formato === FORMATOS.FECHA) {
    const fecha = valor instanceof Date ? valor : new Date(valor);
    return Number.isNaN(fecha.getTime()) ? String(valor) : fechaCorta.format(fecha);
  }
  if (campo === "orden_id") return `#${valor}`;
  return String(valor);
}

function generar(datos, config, tipo, periodo, ahora, { comprimir = true } = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      layout: "landscape",
      margin: 40,
      bufferPages: true,
      compress: comprimir,
      info: { Title: `Reporte de ${config.titulo.toLowerCase()} ${periodo}`, Author: "MEVIPLAST", Subject: `Reporte de ${config.titulo.toLowerCase()}` },
    });
    const partes = [];
    doc.on("data", (parte) => partes.push(parte));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);

    const izquierda = doc.page.margins.left;
    const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const limite = () => doc.page.height - doc.page.margins.bottom - 24;

    // Encabezado
    if (fs.existsSync(LOGO)) doc.image(LOGO, izquierda, 36, { width: 40, height: 40 });
    doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(15).text("MEVIPLAST", izquierda + 50, 40);
    doc.fillColor(GRIS).font("Helvetica").fontSize(9).text("Empaques adhesivos y bolsas plásticas", izquierda + 50, 58);
    doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(15).text(`Reporte de ${config.titulo.toLowerCase()} ${periodo}`, izquierda, 40, { width: ancho, align: "right" });
    doc.fillColor(GRIS).font("Helvetica").fontSize(9)
      .text(`Del ${datos.desde} al ${datos.hastaInclusivo} · Generado el ${fechaLarga.format(ahora)}`, izquierda, 60, { width: ancho, align: "right" });
    doc.moveTo(izquierda, 86).lineTo(izquierda + ancho, 86).lineWidth(1.5).strokeColor(ROJO).stroke();

    // Tarjetas de resumen
    let y = 100;
    const resumen = config.resumen(datos.resumen);
    const anchoTarjeta = (ancho - (resumen.length - 1) * 10) / resumen.length;
    resumen.forEach(([etiqueta, valor, formato], i) => {
      const x = izquierda + i * (anchoTarjeta + 10);
      doc.roundedRect(x, y, anchoTarjeta, 48, 4).lineWidth(0.8).strokeColor(LINEA).stroke();
      doc.fillColor(GRIS).font("Helvetica").fontSize(8.5).text(etiqueta, x + 10, y + 9, { width: anchoTarjeta - 20 });
      doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(14).text(texto(valor, formato), x + 10, y + 24, { width: anchoTarjeta - 20 });
    });
    y += 66;

    // Tablas: el ancho de cada columna sale del ancho que tiene en el Excel
    const tablas = config.hojas
      ? config.hojas.map(([, campo, columnas]) => [TITULOS[campo] || campo, campo, columnas])
      : [[TITULOS.porProducto, "porProducto", config.porProducto], [TITULOS.detalle[tipo], "detalle", config.detalle]];
    for (const [titulo, campo, columnas] of tablas) {
      const filas = datos[campo] || [];
      const anchos = anchosColumnas(columnas, ancho);
      const derecha = (formato) => [FORMATOS.DINERO, FORMATOS.UNIDADES, FORMATOS.PORCENTAJE].includes(formato);
      const encabezado = () => {
        doc.rect(izquierda, y, ancho, 20).fill(FONDO);
        let x = izquierda;
        columnas.forEach(([nombre, , , formato], i) => {
          doc.fillColor(GRIS).font("Helvetica-Bold").fontSize(7.5)
            .text(nombre.toUpperCase(), x + 6, y + 6, { width: anchos[i] - 12, align: derecha(formato) ? "right" : "left", height: 10, ellipsis: true });
          x += anchos[i];
        });
        y += 20;
      };
      if (y + 60 > limite()) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(11.5).text(titulo, izquierda, y);
      y += 18;
      encabezado();
      if (!filas.length) {
        doc.fillColor(GRIS).font("Helvetica").fontSize(9).text("No hay registros en este periodo.", izquierda + 6, y + 6);
        y += 24;
      }
      for (const fila of filas) {
        // Un texto largo pasa a una segunda línea en lugar de cortarse; la fila crece con él
        doc.font("Helvetica").fontSize(8.5);
        const valores = columnas.map(([, clave, , formato]) => texto(fila[clave], formato, clave));
        const altoTexto = Math.max(...valores.map((valor, i) => doc.heightOfString(valor, { width: anchos[i] - 12 })));
        const alto = Math.max(18, Math.min(altoTexto, 24) + 8);
        if (y + alto > limite()) {
          doc.addPage();
          y = doc.page.margins.top;
          encabezado();
        }
        let x = izquierda;
        columnas.forEach(([, , , formato], i) => {
          doc.fillColor(AZUL).font("Helvetica").fontSize(8.5)
            .text(valores[i], x + 6, y + 5, { width: anchos[i] - 12, align: derecha(formato) ? "right" : "left", height: alto - 6, ellipsis: true });
          x += anchos[i];
        });
        y += alto;
        doc.moveTo(izquierda, y).lineTo(izquierda + ancho, y).lineWidth(0.5).strokeColor(LINEA).stroke();
      }
      y += 18;
    }
    if (tipo === "rendimiento") {
      if (y + 30 > limite()) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      doc.fillColor(GRIS).font("Helvetica").fontSize(8)
        .text("Cumplimiento = unidades producidas ÷ meta de las órdenes asignadas al operario que se crearon en el periodo, sin las canceladas. «Unidades registradas» suma todos sus avances del periodo.", izquierda, y, { width: ancho });
    }

    // Pie con el número de página
    const { start, count } = doc.bufferedPageRange();
    for (let i = start; i < start + count; i += 1) {
      doc.switchToPage(i);
      doc.fillColor(GRIS).font("Helvetica").fontSize(8)
        .text(`MEVIPLAST · Página ${i - start + 1} de ${count}`, izquierda, doc.page.height - doc.page.margins.bottom - 10, { width: ancho, align: "right", lineBreak: false });
    }
    doc.end();
  });
}

async function pdfDetalle(tipo, periodo, ahora = new Date(), opciones = {}) {
  const config = COLUMNAS[tipo];
  if (!config) throw new Error("El reporte debe ser de producción, ventas o rendimiento");
  const datos = await cargarDatos(tipo, periodo, ahora);
  return {
    buffer: await generar(datos, config, tipo, periodo, ahora, opciones),
    nombreArchivo: `reporte-${tipo}-${periodo}-${datos.desde}.pdf`,
  };
}

module.exports = { pdfDetalle };
