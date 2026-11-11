const fs = require("fs");

// Datos de conexión a MySQL comunes al servidor y a db:init. En local (XAMPP) basta con DB_HOST, DB_PORT,
// DB_USER y DB_PASSWORD. En la nube (Render con la base en Aiven) la base exige conexión cifrada y el
// servidor usa la hora UTC: DB_SSL=true, el certificado en DB_SSL_CA (o en el archivo DB_SSL_CA_FILE) y
// DB_TIME_ZONE con la zona de la empresa (-05:00 en Colombia).

// Un valor pegado en el panel de la nube puede traer un espacio o un salto de línea al final
// (con «host\n» MySQL responde ENOTFOUND): se quitan antes de usarlo
const limpio = (valor) => String(valor ?? "").trim();

// El certificado puede venir con saltos de línea escritos como «\n» (así se pega en una variable de entorno)
function certificado() {
  if (process.env.DB_SSL_CA) return process.env.DB_SSL_CA.replace(/\\n/g, "\n").trim();
  if (process.env.DB_SSL_CA_FILE) return fs.readFileSync(limpio(process.env.DB_SSL_CA_FILE), "utf8");
  return undefined;
}

function opcionesSsl() {
  if (String(process.env.DB_SSL || "").trim().toLowerCase() !== "true") return undefined;
  const ca = certificado();
  return { ...(ca ? { ca } : {}), rejectUnauthorized: true, minVersion: "TLSv1.2" };
}

function datosConexion() {
  const ssl = opcionesSsl();
  return {
    host: limpio(process.env.DB_HOST) || "localhost",
    port: Number(limpio(process.env.DB_PORT)) || 3306,
    user: limpio(process.env.DB_USER) || "root",
    password: limpio(process.env.DB_PASSWORD),
    ...(ssl ? { ssl } : {}),
  };
}

// «-05:00» o vacío (se queda la zona del servidor de base de datos). Se valida para no armar SQL con
// cualquier texto.
function zonaHoraria() {
  const zona = String(process.env.DB_TIME_ZONE || "").trim();
  if (!zona) return null;
  if (!/^[+-](0\d|1[0-4]):[0-5]\d$/.test(zona)) {
    throw new Error("DB_TIME_ZONE debe tener el formato ±HH:MM, por ejemplo -05:00");
  }
  return zona;
}

module.exports = { datosConexion, opcionesSsl, zonaHoraria };
