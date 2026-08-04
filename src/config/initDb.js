/**
 * Script de inicializacion de base de datos.
 * Ejecuta el esquema (sql/schema.sql) y siembra los 3 usuarios demo
 * que hoy existen "hardcodeados" en public/js/login.js, pero ahora
 * con contrasena cifrada (bcrypt) guardada en MySQL.
 *
 * Uso: npm run db:init
 */
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
require("dotenv").config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });

  console.log("Ejecutando sql/schema.sql ...");
  const schemaPath = path.join(__dirname, "..", "..", "sql", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  await connection.query(schema);

  await connection.changeUser({ database: process.env.DB_NAME || "meviplast_db" });

  const usuariosDemo = [
    { nombre: "Administrador", usuario: "admin", password: "admin123", rol: "admin" },
    { nombre: "Supervisor", usuario: "supervisor", password: "super123", rol: "supervisor" },
    { nombre: "Operario", usuario: "operario", password: "oper123", rol: "operario" },
  ];

  for (const u of usuariosDemo) {
    const [existe] = await connection.query("SELECT id FROM usuarios WHERE usuario = ?", [u.usuario]);
    if (existe.length > 0) {
      console.log(`Usuario '${u.usuario}' ya existe, se omite.`);
      continue;
    }
    const hash = await bcrypt.hash(u.password, 10);
    await connection.query(
      "INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)",
      [u.nombre, u.usuario, hash, u.rol]
    );
    console.log(`Usuario '${u.usuario}' creado (rol: ${u.rol}).`);
  }

  console.log("Base de datos inicializada correctamente.");
  await connection.end();
  process.exit(0);
}

main().catch((error) => {
  console.error("Error al inicializar la base de datos:", error.message);
  process.exit(1);
});
