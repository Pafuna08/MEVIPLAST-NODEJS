/**
 * Script de inicializacion de base de datos.
 * Ejecuta el esquema (sql/schema.sql) y siembra una cuenta demo por rol,
 * con contrasena cifrada (bcrypt), ademas de materias primas, ordenes y
 * existencias DEMO. Solo para bases nuevas o desechables.
 *
 * Uso: npm run db:init
 */
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const { leerEsquema, validarNombreBase } = require("./schema");
require("dotenv").config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });

  const nombreBase = validarNombreBase(process.env.DB_NAME || "meviplast_db");
  console.log(`Ejecutando sql/schema.sql en ${nombreBase} ...`);
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${nombreBase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.changeUser({ database: nombreBase });
  await connection.query(leerEsquema());

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
    {
      nombre: "Vendedor",
      usuario: "vendedor",
      password: "vend123",
      rol: "vendedor",
    },
    {
      nombre: "Almacenista",
      usuario: "almacenista",
      password: "alma123",
      rol: "almacenista",
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

  const muestrasMateriaPrima = [
    ["PEBD", "Bobina o rollo de polietileno de baja densidad (PEBD)", "6 x 12", "0.95", "Transparente", 25],
    ["PEBD", "Bobina o rollo de polietileno de baja densidad (PEBD)", "8 x 12", "1", "Natural", 30],
    ["PEAD", "Bobina o rollo de polietileno de alta densidad (PEAD)", "6 x 8", "2", "Natural", 25],
    ["PEAD", "Bobina o rollo de polietileno de alta densidad (PEAD)", "10 x 15", "2", "Blanco", 30],
    ["PP", "Bobina o rollo de polipropileno (PP)", "6 x 12", "2", "Transparente", 25],
    ["PP", "Bobina o rollo de polipropileno (PP)", "8 x 12", "3", "Blanco", 30],
  ];
  for (const [tipo, descripcion, medida, calibre, color, pesoRollo] of muestrasMateriaPrima) {
    const nombre = `${descripcion} - ${medida} - calibre ${calibre} - ${color}`;
    const [existe] = await connection.query(
      "SELECT id FROM materia_prima WHERE tipo = ? AND medida = ? AND calibre = ? AND color = ? LIMIT 1",
      [tipo, medida, calibre, color],
    );
    if (!existe.length) {
      await connection.query(
        "INSERT INTO materia_prima (nombre, tipo, medida, calibre, color, peso_rollo, cantidad, unidad, stock_minimo) VALUES (?, ?, ?, ?, ?, ?, 0, 'kg', 0)",
        [nombre, tipo, medida, calibre, color, pesoRollo],
      );
    }
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
    "SELECT id FROM materia_prima WHERE tipo = 'PEBD' ORDER BY id LIMIT 1",
  );
  // Variantes iguales a las existencias DEMO, para que el avance sume a ellas
  const ordenes = [
    ["Adhesivo PP", ["10 x 15", "2", "Transparente"], 1200, 720, "en_proceso", "alta", laura[0].id],
    ["Sencilla PP", ["6 x 9", "1", "Natural"], 450, 0, "pendiente", "media", diego[0].id],
    ["Cargadera", ["15 x 20", "2", "Blanco"], 800, 800, "finalizado", "alta", laura[0].id],
    ["Troquel riñón", ["12 x 18", "2", "Transparente"], 600, 180, "en_proceso", "media", operarioDemo[0].id],
  ];
  for (const [
    producto,
    [medida, calibre, color],
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
        "INSERT INTO produccion (producto, medida, calibre, color, cantidad, cantidad_producida, estado, prioridad, materia_prima_id, responsable_id, fecha_fin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          producto,
          medida,
          calibre,
          color,
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
  // Existencias DEMO de materias primas y producto terminado. El script solo
  // completa filas DEMO vacías e inserta variantes que no existen.
  const semillaDemo = path.join(
    __dirname,
    "..",
    "..",
    "sql",
    "migrations",
    "20261026_seed_demo_inventory.sql",
  );
  if (fs.existsSync(semillaDemo)) {
    await connection.query(fs.readFileSync(semillaDemo, "utf8"));
    console.log("Existencias DEMO cargadas.");
  }

  const migracionesPath = path.join(__dirname, "..", "..", "sql", "migrations");
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
