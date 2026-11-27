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

// Explica por qué falló la conexión. Si MySQL está apagado, mysql2 lanza un
// AggregateError con el mensaje vacío; aquí se busca el código en sus errores.
function describirErrorBase(error, { host = "localhost", port = 3306 } = {}) {
  const errores = [error, ...(Array.isArray(error?.errors) ? error.errors : [])];
  const codigo = errores.map((e) => e?.code).find(Boolean);
  if (codigo === "ECONNREFUSED") {
    return `No se pudo conectar a MySQL en ${host}:${port}. Inicia MySQL (por ejemplo desde el panel de XAMPP) y revisa DB_HOST y DB_PORT en backend/.env.`;
  }
  if (codigo === "ENOTFOUND" || codigo === "EAI_AGAIN") {
    return `No se encontró el servidor MySQL «${host}». Revisa DB_HOST en backend/.env.`;
  }
  if (codigo === "ER_ACCESS_DENIED_ERROR") {
    return "MySQL rechazó el usuario o la contraseña. Revisa DB_USER y DB_PASSWORD en backend/.env.";
  }
  const mensaje = errores.map((e) => e?.message).find(Boolean);
  return mensaje || codigo || String(error);
}

// Migraciones del directorio que no figuran en schema_migrations.
function migracionesPendientes(archivos, registradas) {
  const hechas = new Set(registradas);
  return archivos
    .filter((archivo) => archivo.endsWith(".sql") && !hechas.has(archivo))
    .sort();
}

module.exports = {
  leerEsquema,
  validarNombreBase,
  describirErrorBase,
  migracionesPendientes,
};
