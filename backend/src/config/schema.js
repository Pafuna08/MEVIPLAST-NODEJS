const fs = require("fs");
const path = require("path");

const rutaEsquema = path.join(__dirname, "..", "..", "sql", "schema.sql");

// schema.sql conserva CREATE DATABASE/USE meviplast_db para importarlo a mano
// (por ejemplo en phpMyAdmin). Desde código se quitan esas líneas para crear
// las tablas en la base que indique DB_NAME.
function leerEsquema() {
  return fs
    .readFileSync(rutaEsquema, "utf8")
    .replace(/^\s*CREATE DATABASE[^;]*;/im, "")
    .replace(/^\s*USE\s+\w+\s*;/im, "");
}

function validarNombreBase(nombre) {
  if (!/^\w+$/.test(nombre)) {
    throw new Error(`Nombre de base de datos no válido: ${nombre}`);
  }
  return nombre;
}

module.exports = { leerEsquema, validarNombreBase };
