// Topes de cantidades y validación estricta de números (DEF-022). Un número fuera de rango se rechaza
// con 400 en lugar de dejar que la base lo recorte; las unidades (bolsas) son enteras y los kg y el
// dinero admiten hasta 2 decimales.
const LIMITES = {
  UNIDADES_MAX: 1000000, // meta de una orden o plantilla, avance, ingreso y salida de inventario
  KG_MAX: 100000, // peso del rollo, movimientos y stock mínimo de una bobina
  PAQUETES_MAX: 1000, // paquetes en una venta
  UNIDADES_POR_PAQUETE: [50, 100, 500], // presentaciones de venta (CR-018)
  VENTA_MAX: 100000000, // precio por paquete y total de una venta, en pesos
};

const miles = (valor) => valor.toLocaleString("es-CO");

function errorDeDato(mensaje) {
  const error = new Error(mensaje);
  error.statusCode = 400;
  return error;
}

// Acepta un número de JSON o un texto que sea solo un número («12» o «12.5»); «2abc», «1e5» o «0x10» no
function leerNumero(valor) {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string" && /^\s*-?\d+(?:[.,]\d+)?\s*$/.test(valor)) return Number(valor.replace(",", "."));
  return NaN;
}

// Unidades: entero mayor que cero y hasta el máximo indicado
function entero(valor, campo, maximo = LIMITES.UNIDADES_MAX) {
  const numero = leerNumero(valor);
  if (!Number.isInteger(numero) || numero <= 0) throw errorDeDato(`${campo} debe ser un número entero mayor que cero`);
  if (numero > maximo) throw errorDeDato(`${campo} admite como máximo ${miles(maximo)}`);
  return numero;
}

// Kg o dinero: mayor que cero (o cero si se permite), hasta 2 decimales y hasta el máximo indicado
function decimal(valor, campo, maximo, { permitirCero = false, prefijo = "" } = {}) {
  const numero = leerNumero(valor);
  if (!Number.isFinite(numero) || numero < 0 || (!permitirCero && numero === 0)) {
    throw errorDeDato(`${campo} debe ser un número mayor que ${permitirCero ? "o igual a " : ""}cero`);
  }
  if (Math.abs(numero * 100 - Math.round(numero * 100)) > 1e-6) {
    throw errorDeDato(`${campo} admite como máximo 2 decimales`);
  }
  if (numero > maximo) throw errorDeDato(`${campo} admite como máximo ${prefijo}${miles(maximo)}`);
  return numero;
}

module.exports = { LIMITES, leerNumero, entero, decimal, miles, errorDeDato };
