const mysql = require("mysql2/promise");
const log = require("../utils/logger").crearLogger("database");
require("dotenv").config();

// Pool de conexiones: mejor rendimiento que abrir/cerrar conexion en cada consulta
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
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
