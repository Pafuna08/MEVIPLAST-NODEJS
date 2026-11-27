// RN-025: formato de medida y calibre y color de una lista fija (inventario, órdenes, plantillas y materias primas).
const { colores } = require("../constants/colores");
const { tallasPorLinea } = require("../constants/productosTerminados");
// Devuelve el valor normalizado para que «10x15», «10 X 15» y «10 x 15» sean la misma variante.

const NUMERO = String.raw`\d{1,4}(?:[.,]\d{1,2})?`;
const MEDIDA = new RegExp(String.raw`^(${NUMERO})\s*[xX×*]\s*(${NUMERO})\s*(cm|mm|m|in|pulg)?$`, "i");
const CALIBRE = /^\d{1,3}(?:[.,]\d{1,2})?$/;
const COLOR = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;

function errorDeDato(mensaje) {
  const error = new Error(mensaje);
  error.statusCode = 400;
  return error;
}

// «0,950» → «0.95»; «010» → «10»
function numeroTexto(valor) {
  return String(Number(valor.replace(",", ".")));
}

function normalizarMedida(valor) {
  const texto = typeof valor === "string" ? valor.trim() : "";
  const partes = MEDIDA.exec(texto);
  if (!partes || Number(partes[1].replace(",", ".")) <= 0 || Number(partes[2].replace(",", ".")) <= 0) {
    throw errorDeDato("La medida debe ser ancho x largo, por ejemplo 10 x 15 o 40 x 60 cm");
  }
  const unidad = partes[3] ? ` ${partes[3].toLowerCase()}` : "";
  return `${numeroTexto(partes[1])} x ${numeroTexto(partes[2])}${unidad}`;
}

function normalizarCalibre(valor) {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (!CALIBRE.test(texto) || Number(texto.replace(",", ".")) <= 0) {
    throw errorDeDato("El calibre debe ser un número mayor que cero, por ejemplo 0.95 o 2");
  }
  return numeroTexto(texto);
}

// Sin tildes ni mayúsculas, para comparar «cafe», «CAFÉ» o «Café» con la lista
const clave = (texto) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// El color debe ser uno de la lista fija (RN-025); se guarda con el nombre exacto de la lista
function normalizarColor(valor) {
  const texto = typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";
  const color = COLOR.test(texto) ? colores.find((opcion) => clave(opcion) === clave(texto)) : undefined;
  if (!color) throw errorDeDato(`El color debe ser uno de la lista: ${colores.join(", ")}`);
  return color;
}

// CR-019: en una línea con tallas (Cargadera) la medida es una de sus tallas: «t20» o «T 20» → «T20»
function normalizarTalla(valor, linea) {
  const tallas = tallasPorLinea[linea];
  const texto = typeof valor === "string" ? valor.trim().toUpperCase().replace(/\s+/g, "") : "";
  if (!tallas.includes(texto)) {
    throw errorDeDato(`La medida de ${linea} debe ser ${tallas.slice(0, -1).join(", ")} o ${tallas[tallas.length - 1]}`);
  }
  return texto;
}

// Bobinas (MEVI-115): el tamaño del rollo es un número mayor que cero con hasta 2 decimales en pulgadas
// (hasta 200) o centímetros (hasta 500); se guarda en la columna medida como «28 pulg» o «27.5 cm»
const UNIDADES_ROLLO = {
  pulgadas: { abreviatura: "pulg", maximo: 200 },
  centimetros: { abreviatura: "cm", maximo: 500 },
};
const TAMANO_ROLLO = /^\d{1,3}(?:[.,]\d+)?$/;

function normalizarTamanoRollo(tamano, unidadMedida) {
  const unidad = UNIDADES_ROLLO[clave(typeof unidadMedida === "string" ? unidadMedida.trim() : "")];
  if (!unidad) throw errorDeDato("Selecciona la unidad de medida: pulgadas o centímetros");
  const texto = typeof tamano === "number" ? String(tamano) : typeof tamano === "string" ? tamano.trim() : "";
  const numero = Number(texto.replace(",", "."));
  if (!TAMANO_ROLLO.test(texto) || !(numero > 0)) {
    throw errorDeDato("El tamaño del rollo debe ser un número mayor que cero, por ejemplo 28 o 27.5");
  }
  if ((texto.split(/[.,]/)[1] || "").length > 2) throw errorDeDato("El tamaño del rollo admite como máximo 2 decimales");
  if (numero > unidad.maximo) {
    throw errorDeDato(`El tamaño del rollo admite como máximo ${unidad.maximo} ${unidad.abreviatura === "pulg" ? "pulgadas" : "centímetros"}`);
  }
  return `${numeroTexto(texto)} ${unidad.abreviatura}`;
}

function normalizarVariante({ medida, calibre, color }, linea) {
  return {
    medida: tallasPorLinea[linea] ? normalizarTalla(medida, linea) : normalizarMedida(medida),
    calibre: normalizarCalibre(calibre),
    color: normalizarColor(color),
  };
}

module.exports = { normalizarMedida, normalizarCalibre, normalizarColor, normalizarVariante, normalizarTalla, normalizarTamanoRollo };
