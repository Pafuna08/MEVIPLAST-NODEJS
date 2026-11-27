const mysql = require("mysql2/promise");
const log = require("../utils/logger").crearLogger("database");
require("dotenv").config();
const { datosConexion, zonaHoraria } = require("./conexion");

const zona = zonaHoraria();

// Pool de conexiones: mejor rendimiento que abrir/cerrar conexion en cada consulta.
// En la nube la conexión va cifrada (DB_SSL) y con la zona horaria de la empresa (DB_TIME_ZONE).
const pool = mysql.createPool({
  ...datosConexion(),
  database: process.env.DB_NAME || "meviplast_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

// DEF-022: modo estricto en cada conexión. XAMPP trae MariaDB sin STRICT_TRANS_TABLES, y así un número
// o un texto que no cabe en su columna se guardaba recortado sin avisar; ahora la base da error.
pool.on("connection", (conexion) => {
  conexion.query(
    "SET SESSION sql_mode = TRIM(BOTH ',' FROM CONCAT(@@SESSION.sql_mode, ',STRICT_TRANS_TABLES'))",
    (error) => {
      if (error) log.error("No se pudo activar el modo estricto de MySQL", { error: error.message });
    },
  );
  // La fecha que guarda MySQL (CURRENT_TIMESTAMP) queda en la hora de la empresa aunque el servidor esté en UTC
  if (zona) {
    conexion.query("SET time_zone = ?", [zona], (error) => {
      if (error) log.error("No se pudo fijar la zona horaria de MySQL", { error: error.message });
    });
  }
});

// Verifica la conexion al arrancar el servidor
async function verificarConexion() {
  try {
    const connection = await pool.getConnection();
    log.info("Conexión a MySQL establecida", { base: process.env.DB_NAME || "meviplast_db" });
    connection.release();
  } catch (error) {
    log.error("No fue posible conectar a MySQL", { error: error.message });
    process.exit(1);
  }
}

module.exports = { pool, verificarConexion };
