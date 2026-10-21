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

  await connection.changeUser({
    database: process.env.DB_NAME || "meviplast_db",
  });

  // Migracion segura para instalaciones creadas antes de los campos de avance.
  await connection.query(`ALTER TABLE produccion
    ADD COLUMN IF NOT EXISTS prioridad ENUM('baja', 'media', 'alta') NOT NULL DEFAULT 'media',
    ADD COLUMN IF NOT EXISTS cantidad_producida DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lote VARCHAR(80) NULL,
    ADD COLUMN IF NOT EXISTS observaciones VARCHAR(500) NULL`);

  const usuariosDemo = [
    {
      nombre: "Administrador",
      usuario: "admin",
      password: "admin123",
      rol: "admin",
    },
    {
      nombre: "Supervisor",
      usuario: "supervisor",
      password: "super123",
      rol: "supervisor",
    },
    {
      nombre: "Operario",
      usuario: "operario",
      password: "oper123",
      rol: "operario",
    },
  ];

  for (const u of usuariosDemo) {
    const [existe] = await connection.query(
      "SELECT id FROM usuarios WHERE usuario = ?",
      [u.usuario],
    );
    if (existe.length > 0) {
      console.log(`Usuario '${u.usuario}' ya existe, se omite.`);
      continue;
    }
    const hash = await bcrypt.hash(u.password, 10);
    await connection.query(
      "INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)",
      [u.nombre, u.usuario, hash, u.rol],
    );
    console.log(`Usuario '${u.usuario}' creado (rol: ${u.rol}).`);
  }

  const operadores = [
    {
      nombre: "Laura Martinez",
      usuario: "laura",
      password: "laura123",
      rol: "operario",
    },
    {
      nombre: "Diego Rojas",
      usuario: "diego",
      password: "diego123",
      rol: "operario",
    },
  ];
  for (const u of operadores) {
    const [existe] = await connection.query(
      "SELECT id FROM usuarios WHERE usuario = ?",
      [u.usuario],
    );
    if (!existe.length) {
      const hash = await bcrypt.hash(u.password, 10);
      await connection.query(
        "INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)",
        [u.nombre, u.usuario, hash, u.rol],
      );
    }
  }

  const semillas = [
    [
      "materia_prima",
      "nombre",
      "Polietileno BD",
      "INSERT INTO materia_prima (nombre, tipo, cantidad, unidad, proveedor, stock_minimo) VALUES ('Polietileno BD', 'Resina', 850, 'kg', 'Plasticos Andinos', 200)",
    ],
    [
      "materia_prima",
      "nombre",
      "Pigmento azul",
      "INSERT INTO materia_prima (nombre, tipo, cantidad, unidad, proveedor, stock_minimo) VALUES ('Pigmento azul', 'Aditivo', 25, 'kg', 'Colorquim', 40)",
    ],
    [
      "inventario",
      "producto",
      "Bolsa industrial 40x60",
      "INSERT INTO inventario (producto, cantidad, ubicacion) VALUES ('Bolsa industrial 40x60', 380, 'Bodega A')",
    ],
    [
      "inventario",
      "producto",
      "Empaque adhesivo azul",
      "INSERT INTO inventario (producto, cantidad, ubicacion) VALUES ('Empaque adhesivo azul', 220, 'Bodega B')",
    ],
  ];
  for (const [tabla, campo, valor, insercion] of semillas) {
    const [existe] = await connection.query(
      `SELECT id FROM ${tabla} WHERE ${campo} = ? LIMIT 1`,
      [valor],
    );
    if (!existe.length) await connection.query(insercion);
  }

  const [laura] = await connection.query(
    "SELECT id FROM usuarios WHERE usuario = 'laura'",
  );
  const [diego] = await connection.query(
    "SELECT id FROM usuarios WHERE usuario = 'diego'",
  );
  const [operarioDemo] = await connection.query(
    "SELECT id FROM usuarios WHERE usuario = 'operario'",
  );
  const [materia] = await connection.query(
    "SELECT id FROM materia_prima WHERE nombre = 'Polietileno BD'",
  );
  const ordenes = [
    ["Bolsa industrial 40x60", 1200, 720, "en_proceso", "alta", laura[0].id],
    ["Empaque adhesivo azul", 450, 0, "pendiente", "media", diego[0].id],
    ["Bolsa transparente 30x45", 800, 800, "finalizado", "alta", laura[0].id],
    [
      "Rollo protector azul",
      600,
      180,
      "en_proceso",
      "media",
      operarioDemo[0].id,
    ],
  ];
  for (const [
    producto,
    cantidad,
    producido,
    estado,
    prioridad,
    responsable,
  ] of ordenes) {
    const [existe] = await connection.query(
      "SELECT id FROM produccion WHERE producto = ? LIMIT 1",
      [producto],
    );
    if (!existe.length)
      await connection.query(
        "INSERT INTO produccion (producto, cantidad, cantidad_producida, estado, prioridad, materia_prima_id, responsable_id, fecha_fin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          producto,
          cantidad,
          producido,
          estado,
          prioridad,
          materia[0].id,
          responsable,
          estado === "finalizado" ? new Date() : null,
        ],
      );
  }
  const [admin] = await connection.query(
    "SELECT id FROM usuarios WHERE usuario = 'admin'",
  );
  const [venta] = await connection.query(
    "SELECT id FROM ventas WHERE cliente = 'Distribuciones Norte' LIMIT 1",
  );
  if (!venta.length)
    await connection.query(
      "INSERT INTO ventas (cliente, producto, cantidad, precio_unitario, usuario_id) VALUES (?, ?, ?, ?, ?)",
      ["Distribuciones Norte", "Bolsa industrial 40x60", 35, 1800, admin[0].id],
    );

  const migracionesPath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "sql",
    "migrations",
  );
  if (
    fs.existsSync(migracionesPath) &&
    process.env.DB_APPLY_MIGRATIONS === "true"
  ) {
    if (process.env.DB_BACKUP_CONFIRMED !== "true") {
      throw new Error(
        "Confirma un respaldo verificado con DB_BACKUP_CONFIRMED=true antes de aplicar migraciones",
      );
    }
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL UNIQUE,
      aplicada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    const migraciones = fs
      .readdirSync(migracionesPath)
      .filter((file) => file.endsWith(".sql"))
      .sort();
    for (const migracion of migraciones) {
      const [aplicadas] = await connection.query(
        "SELECT id FROM schema_migrations WHERE nombre = ?",
        [migracion],
      );
      if (aplicadas.length) continue;
      const sql = fs.readFileSync(
        path.join(migracionesPath, migracion),
        "utf8",
      );
      await connection.query(sql);
      await connection.query(
        "INSERT INTO schema_migrations (nombre) VALUES (?)",
        [migracion],
      );
      console.log(`Migracion aplicada: ${migracion}`);
    }
  } else if (fs.existsSync(migracionesPath)) {
    console.warn(
      "Migraciones pendientes omitidas. Revisa un respaldo verificado y configura DB_APPLY_MIGRATIONS=true y DB_BACKUP_CONFIRMED=true para autorizarlas.",
    );
  }

  console.log("Base de datos inicializada correctamente.");
  await connection.end();
  process.exit(0);
}

main().catch((error) => {
  console.error("Error al inicializar la base de datos:", error.message);
  process.exit(1);
});
