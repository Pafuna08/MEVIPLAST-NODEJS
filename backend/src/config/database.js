const mysql = require("mysql2/promise");
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

// Verifica la conexion al arrancar el servidor
async function verificarConexion() {
  try {
    const connection = await pool.getConnection();
    console.log(`Conexion a MySQL establecida (${process.env.DB_NAME || "meviplast_db"})`);
    connection.release();
  } catch (error) {
    console.error("No fue posible conectar a MySQL:", error.message);
    process.exit(1);
  }
}

module.exports = { pool, verificarConexion };
