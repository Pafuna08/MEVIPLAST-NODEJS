// RN-025: formato de medida, calibre y color (inventario, órdenes, plantillas y materias primas).
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

function normalizarColor(valor) {
  const texto = typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";
  if (texto.length < 3 || texto.length > 40 || !COLOR.test(texto)) {
    throw errorDeDato("El color solo admite letras y espacios (3 a 40), por ejemplo Transparente o Blanco hueso");
  }
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

function normalizarVariante({ medida, calibre, color }) {
  return {
    medida: normalizarMedida(medida),
    calibre: normalizarCalibre(calibre),
    color: normalizarColor(color),
  };
}

module.exports = { normalizarMedida, normalizarCalibre, normalizarColor, normalizarVariante };
