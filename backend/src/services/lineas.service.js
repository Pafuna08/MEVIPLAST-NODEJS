const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");
const { productosTerminados } = require("../constants/productosTerminados");
const { errorDeDato } = require("../utils/numeros");

// Letras (con tildes y ñ), números, espacios, punto y guion; al menos una letra
const FORMATO_NOMBRE = /^(?=.*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .-]+$/;
const LARGO_MIN = 3;
const LARGO_MAX = 60;

// RN-012 / CR-020: líneas de la tabla lineas_producto, en el orden en que se crearon.
// Sin la tabla (base sin la migración 20261110_lineas_producto.sql) quedan las seis de la reunión inicial.
async function listar() {
  try {
    const [filas] = await pool.query("SELECT nombre FROM lineas_producto ORDER BY id");
    const nombres = Array.isArray(filas) ? filas.map((fila) => fila?.nombre).filter(Boolean) : [];
    return nombres.length ? nombres : [...productosTerminados];
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") return [...productosTerminados];
    throw error;
  }
}

// Para validar una línea: las seis de base no se borran, así que con ellas no hace falta consultar la tabla
async function paraValidar(nombre) {
  return productosTerminados.includes(nombre) ? productosTerminados : listar();
}

function normalizarNombre(valor) {
  const nombre = typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";
  if (!nombre) throw errorDeDato("El nombre de la línea es obligatorio");
  if (nombre.length < LARGO_MIN || nombre.length > LARGO_MAX) {
    throw errorDeDato(`El nombre de la línea debe tener entre ${LARGO_MIN} y ${LARGO_MAX} caracteres`);
  }
  if (!FORMATO_NOMBRE.test(nombre)) {
    throw errorDeDato("El nombre de la línea solo admite letras, números, espacios, punto y guion");
  }
  // Primera letra en mayúscula, como las líneas del catálogo
  return nombre.charAt(0).toLocaleUpperCase("es") + nombre.slice(1);
}

// Solo el administrador (ruta). Una línea nueva se mide en «ancho x largo» (RN-025).
async function crear(datos, actorId) {
  const nombre = normalizarNombre(datos?.nombre);
  // La comparación usa la intercalación de la columna: «cargadera» o «Troquel rinon» ya existen
  const [repetidas] = await pool.query("SELECT nombre FROM lineas_producto WHERE nombre = ? LIMIT 1", [nombre]);
  if (repetidas.length) {
    const error = new Error(`La línea «${repetidas[0].nombre}» ya existe`);
    error.statusCode = 409;
    throw error;
  }
  try {
    await pool.query("INSERT INTO lineas_producto (nombre) VALUES (?)", [nombre]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      const repetida = new Error("Esa línea ya existe");
      repetida.statusCode = 409;
      throw repetida;
    }
    throw error;
  }
  await registrarAuditoria({
    usuarioId: actorId,
    accion: "CREAR_LINEA_PRODUCTO",
    tabla: "lineas_producto",
    detalle: `Línea nueva '${nombre}'`,
  });
  return { nombre };
}

module.exports = { listar, paraValidar, crear, normalizarNombre };
