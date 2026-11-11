const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

// Comprobante de venta en PDF (RF-023): se abre en una pestaña con el visor del navegador, que ya
// trae imprimir y descargar; así nadie depende de saber «Guardar como PDF» en el diálogo de impresión.
const LOGO = path.join(__dirname, "..", "..", "..", "frontend", "assets", "logo-meviplast.png");
const AZUL = "#0b2545";
const ROJO = "#d02c3a";
const GRIS = "#5f6e81";
const LINEA = "#dde3ea";

const dinero = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const numero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const fechaLarga = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeStyle: "short" });

function fecha(valor) {
  const d = valor ? new Date(valor) : null;
  return d && !Number.isNaN(d.getTime()) ? fechaLarga.format(d) : "—";
}

function presentacion(item) {
  const paquetes = Number(item.cantidad_paquetes);
  return `${numero.format(paquetes)} ${paquetes === 1 ? "paquete" : "paquetes"} de ${numero.format(Number(item.unidades_paquete))}`;
}

const variante = (item) => [item.medida, item.calibre && `calibre ${item.calibre}`, item.color].filter(Boolean).join(" · ");

// Columnas de la tabla: [título, ancho, alineación]
const COLUMNAS = [
  ["Producto", 168, "left"],
  ["Presentación", 100, "left"],
  ["Unidades", 62, "right"],
  ["Precio por paquete", 107, "right"],
  ["Total", 75, "right"],
];

function generarComprobantePdf(venta, { comprimir = true } = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margin: 50,
      compress: comprimir,
      info: { Title: `Comprobante de venta ${venta.numero}`, Author: "MEVIPLAST", Subject: "Comprobante de venta" },
    });
    const partes = [];
    doc.on("data", (parte) => partes.push(parte));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);

    const izquierda = doc.page.margins.left;
    const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Encabezado: logo, empresa, título y número
    if (fs.existsSync(LOGO)) doc.image(LOGO, izquierda, 45, { width: 46, height: 46 });
    doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(16).text("MEVIPLAST", izquierda + 58, 50);
    doc.fillColor(GRIS).font("Helvetica").fontSize(9.5).text("Empaques adhesivos y bolsas plásticas", izquierda + 58, 70);
    doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(15).text("Comprobante de venta", izquierda, 50, { width: ancho, align: "right" });
    doc.fillColor(GRIS).font("Helvetica-Bold").fontSize(10.5).text(`N.º ${venta.numero}`, izquierda, 70, { width: ancho, align: "right" });
    doc.moveTo(izquierda, 102).lineTo(izquierda + ancho, 102).lineWidth(1.5).strokeColor(ROJO).stroke();

    // Datos de la venta
    const datos = [["FECHA", fecha(venta.fecha)], ["CLIENTE", venta.cliente || "—"], ["ATENDIDO POR", venta.vendedor || "—"]];
    const anchoDato = ancho / 3;
    datos.forEach(([etiqueta, valor], i) => {
      const x = izquierda + i * anchoDato;
      doc.fillColor(GRIS).font("Helvetica-Bold").fontSize(8).text(etiqueta, x, 118, { width: anchoDato - 10 });
      doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(11).text(String(valor), x, 131, { width: anchoDato - 10 });
    });

    // Tabla de productos
    let y = 175;
    const encabezadoTabla = () => {
      doc.rect(izquierda, y, ancho, 22).fill("#f4f6f8");
      let x = izquierda + 8;
      for (const [titulo, w, align] of COLUMNAS) {
        doc.fillColor(GRIS).font("Helvetica-Bold").fontSize(8).text(titulo.toUpperCase(), x, y + 7, { width: w - 8, align });
        x += w;
      }
      y += 22;
    };
    encabezadoTabla();
    const items = Array.isArray(venta.items) ? venta.items : [];
    for (const item of items) {
      const detalle = variante(item);
      const alto = detalle ? 34 : 24;
      if (y + alto > doc.page.height - doc.page.margins.bottom - 70) {
        doc.addPage();
        y = doc.page.margins.top;
        encabezadoTabla();
      }
      const valores = [
        null,
        presentacion(item),
        numero.format(Number(item.cantidad)),
        dinero.format(Number(item.precio_paquete)),
        dinero.format(Number(item.total)),
      ];
      let x = izquierda + 8;
      COLUMNAS.forEach(([, w, align], i) => {
        if (i === 0) {
          doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(10).text(item.familia || item.producto || "—", x, y + 7, { width: w - 8 });
          if (detalle) doc.fillColor(GRIS).font("Helvetica").fontSize(8).text(detalle, x, y + 20, { width: w - 8 });
        } else {
          doc.fillColor(AZUL).font("Helvetica").fontSize(10).text(valores[i], x, y + 7, { width: w - 8, align });
        }
        x += w;
      });
      y += alto;
      doc.moveTo(izquierda, y).lineTo(izquierda + ancho, y).lineWidth(0.7).strokeColor(LINEA).stroke();
    }

    // Total y nota
    y += 14;
    doc.fillColor(AZUL).font("Helvetica").fontSize(12).text("Total", izquierda, y + 2, { width: ancho - 120, align: "right" });
    doc.font("Helvetica-Bold").fontSize(14).text(dinero.format(Number(venta.total)), izquierda + ancho - 112, y, { width: 112, align: "right" });
    y += 26;
    doc.fillColor(GRIS).font("Helvetica").fontSize(8.5).text("Documento de control interno. No es una factura electrónica.", izquierda, y, { width: ancho, align: "right" });

    doc.end();
  });
}

module.exports = { generarComprobantePdf };
