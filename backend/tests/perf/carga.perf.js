// Prueba de carga de RNF-004 contra una base MySQL/MariaDB real y desechable.
// Uso: npm run test:perf --prefix backend [-- --json <archivo>]
// Crea PERF_DB_NAME (por defecto meviplast_perf) con ~1 500 registros, levanta la API
// como proceso aparte y simula 5 usuarios concurrentes, uno por rol.
// Criterio: percentil 95 ≤ 3 s y ninguna respuesta con error. Nunca apunta a meviplast_db.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const { leerEsquema } = require("../../src/config/schema");
const { productosTerminados } = require("../../src/constants/productosTerminados");

const DB = process.env.PERF_DB_NAME || "meviplast_perf";
if (!/^meviplast_perf\w*$/.test(DB)) {
  throw new Error(`PERF_DB_NAME debe empezar por "meviplast_perf" (recibido: ${DB})`);
}
const PUERTO = Number(process.env.PERF_PORT) || 3997;
const BASE = `http://127.0.0.1:${PUERTO}/api`;
const ITERACIONES = Number(process.env.PERF_ITERACIONES) || 20;
const UMBRAL_P95_MS = 3000;
const CLAVE = "Perf-clave-123";
const ROLES = ["admin", "supervisor", "operario", "vendedor", "almacenista"];
const salidaJson = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;

const conexion = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  multipleStatements: true,
};

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];

async function prepararBase() {
  const raiz = await mysql.createConnection(conexion);
  await raiz.query(`DROP DATABASE IF EXISTS \`${DB}\``);
  await raiz.query(`CREATE DATABASE \`${DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await raiz.changeUser({ database: DB });
  await raiz.query(leerEsquema());

  // Mismo costo de bcrypt que la aplicación, para que el login se mida con su costo real
  const hash = await bcrypt.hash(CLAVE, 10);
  const ids = {};
  for (const rol of ROLES) {
    const [r] = await raiz.query(
      "INSERT INTO usuarios (nombre, usuario, correo, password_hash, rol) VALUES (?, ?, ?, ?, ?)",
      [`Perf ${rol}`, `perf_${rol}`, `perf_${rol}@example.test`, hash, rol],
    );
    ids[rol] = r.insertId;
  }

  const materias = [];
  for (let i = 1; i <= 20; i += 1) {
    const [r] = await raiz.query(
      "INSERT INTO materia_prima (nombre, tipo, cantidad, stock_minimo) VALUES (?, ?, 100000, 50)",
      [`Materia perf ${i}`, azar(["PEBD", "PEAD", "PP"])],
    );
    materias.push(r.insertId);
  }

  const variantes = [];
  for (const familia of productosTerminados) {
    for (let i = 1; i <= 10; i += 1) {
      const medida = `${10 + i} x ${15 + i}`;
      const [r] = await raiz.query(
        "INSERT INTO inventario (producto, familia, medida, calibre, color, cantidad, ubicacion) VALUES (?, ?, ?, '2', 'Transparente', 10000000, 'Bodega perf')",
        [`${familia} · ${medida} · calibre 2 · Transparente`, familia, medida],
      );
      variantes.push({ id: r.insertId, producto: `${familia} · ${medida} · calibre 2 · Transparente` });
    }
  }

  // Órdenes: las del operario quedan en proceso con meta alta para poder registrar avances
  const ordenesOperario = [];
  for (let i = 1; i <= 250; i += 1) {
    const propia = i <= 20;
    const estado = propia ? "en_proceso" : azar(["pendiente", "en_proceso", "finalizado"]);
    const [r] = await raiz.query(
      `INSERT INTO produccion (producto, cantidad, supervisor_id, responsable_id, estado, prioridad, cantidad_producida, fecha_inicio)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL ? DAY)`,
      [azar(productosTerminados), propia ? 10000000 : 1000, ids.supervisor, ids.operario, estado, azar(["baja", "media", "alta"]), estado === "finalizado" ? 1000 : 0, i % 28],
    );
    if (propia) ordenesOperario.push(r.insertId);
  }

  // Ventas y movimientos repartidos en el mes en curso para que los reportes tengan volumen
  for (let i = 1; i <= 400; i += 1) {
    const v = azar(variantes);
    const dias = i % 25;
    const [r] = await raiz.query(
      `INSERT INTO ventas (cliente, producto, cantidad, precio_unitario, inventario_id, cantidad_paquetes, unidades_paquete, precio_paquete, usuario_id, fecha)
       VALUES (?, ?, 500, 60, ?, 2, 250, 15000, ?, NOW() - INTERVAL ? DAY)`,
      [`Cliente perf ${i % 40}`, v.producto, v.id, ids.vendedor, dias],
    );
    await raiz.query(
      "INSERT INTO movimientos_inventario (inventario_id, usuario_id, venta_id, tipo, cantidad, fecha) VALUES (?, ?, ?, 'venta', 500, NOW() - INTERVAL ? DAY)",
      [v.id, ids.vendedor, r.insertId, dias],
    );
  }
  for (let i = 1; i <= 150; i += 1) {
    await raiz.query(
      "INSERT INTO movimientos_inventario (inventario_id, usuario_id, tipo, cantidad, fecha) VALUES (?, ?, 'produccion', 300, NOW() - INTERVAL ? DAY)",
      [azar(variantes).id, ids.operario, i % 25],
    );
  }
  for (let i = 1; i <= 200; i += 1) {
    await raiz.query(
      "INSERT INTO movimientos_materia_prima (materia_prima_id, usuario_id, tipo, cantidad, fecha) VALUES (?, ?, 'compra', 40, NOW() - INTERVAL ? DAY)",
      [azar(materias), ids.almacenista, i % 25],
    );
  }

  const [[{ total }]] = await raiz.query(
    `SELECT (SELECT COUNT(*) FROM produccion) + (SELECT COUNT(*) FROM ventas) + (SELECT COUNT(*) FROM movimientos_inventario)
          + (SELECT COUNT(*) FROM movimientos_materia_prima) + (SELECT COUNT(*) FROM inventario) + (SELECT COUNT(*) FROM materia_prima) AS total`,
  );
  return { raiz, ids, materias, variantes, ordenesOperario, registros: Number(total) };
}

async function levantarApi() {
  const proceso = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, "..", ".."),
    env: { ...process.env, DB_NAME: DB, PORT: String(PUERTO), JWT_SECRET: "perf-only-secret", CORS_ORIGINS: "" },
    stdio: "ignore",
  });
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return proceso;
    } catch {
      // la API todavía no escucha
    }
    await esperar(250);
  }
  proceso.kill();
  throw new Error("La API no respondió en 15 s");
}

const mediciones = [];
async function medir(operacion, metodo, ruta, token, cuerpo) {
  const inicio = performance.now();
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await respuesta.arrayBuffer();
  const ms = performance.now() - inicio;
  mediciones.push({ operacion, ms, estado: respuesta.status });
  const texto = Buffer.from(datos).toString("utf8");
  return respuesta.headers.get("content-type")?.includes("json") && texto ? JSON.parse(texto) : null;
}

// Operaciones habituales de cada rol (una vuelta)
function guiones(datos) {
  return {
    admin: async (t) => {
      await medir("Listar usuarios", "GET", "/usuarios", t);
      await medir("Listar producción", "GET", "/produccion", t);
      await medir("Listar inventario", "GET", "/inventario", t);
      await medir("Listar ventas", "GET", "/ventas", t);
      await medir("Reporte ventas mensual", "GET", "/reportes/ventas/detalle?periodo=mensual", t);
      await medir("Reporte producción mensual", "GET", "/reportes/produccion/detalle?periodo=mensual", t);
      await medir("Excel ventas mensual", "GET", "/reportes/ventas/detalle/excel?periodo=mensual", t);
      await medir("Bitácora de auditoría", "GET", "/reportes/auditoria", t);
    },
    supervisor: async (t) => {
      await medir("Listar producción", "GET", "/produccion", t);
      await medir("Listar operarios", "GET", "/produccion/operarios", t);
      await medir("Listar materias primas", "GET", "/materia-prima", t);
      await medir("Reporte producción semanal", "GET", "/reportes/produccion/detalle?periodo=semanal", t);
    },
    operario: async (t) => {
      await medir("Listar producción", "GET", "/produccion", t);
      await medir("Registrar avance", "POST", `/produccion/${azar(datos.ordenesOperario)}/avance`, t, { cantidad: 10, lote: "PERF" });
    },
    vendedor: async (t) => {
      await medir("Listar inventario", "GET", "/inventario", t);
      const venta = await medir("Registrar venta", "POST", "/ventas", t, {
        cliente: "Cliente carga", inventario_id: azar(datos.variantes).id, cantidad_paquetes: 1, unidades_paquete: 100, precio_paquete: 9000,
      });
      if (venta?.id) await medir("Comprobante de venta", "GET", `/ventas/${venta.id}/comprobante`, t);
      await medir("Listar ventas", "GET", "/ventas", t);
    },
    almacenista: async (t) => {
      await medir("Listar materias primas", "GET", "/materia-prima", t);
      await medir("Registrar compra", "POST", "/materia-prima/movimientos", t, { materia_prima_id: azar(datos.materias), tipo: "compra", cantidad: 5, observaciones: "Carga" });
      await medir("Movimientos de materia prima", "GET", "/materia-prima/movimientos", t);
      await medir("Movimientos de inventario", "GET", "/inventario/movimientos", t);
    },
  };
}

function percentil(valores, p) {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.min(orden.length - 1, Math.ceil((p / 100) * orden.length) - 1)];
}

async function main() {
  console.log(`1. Preparando ${DB}…`);
  const datos = await prepararBase();
  console.log(`   ${datos.registros} registros de negocio`);
  console.log(`2. Levantando la API en el puerto ${PUERTO}…`);
  const api = await levantarApi();
  const inicio = Date.now();
  try {
    console.log(`3. ${ROLES.length} usuarios concurrentes × ${ITERACIONES} vueltas…`);
    const acciones = guiones(datos);
    await Promise.all(ROLES.map(async (rol) => {
      const sesion = await medir("Iniciar sesión", "POST", "/auth/login", null, { usuario: `perf_${rol}`, password: CLAVE });
      for (let i = 0; i < ITERACIONES; i += 1) await acciones[rol](sesion.token);
    }));
  } finally {
    api.kill();
    if (process.env.PERF_KEEP_DB !== "true") await datos.raiz.query(`DROP DATABASE IF EXISTS \`${DB}\``);
    await datos.raiz.end();
  }

  const porOperacion = {};
  for (const m of mediciones) (porOperacion[m.operacion] ||= []).push(m);
  const filas = Object.entries(porOperacion).map(([operacion, lista]) => {
    const ms = lista.map((m) => m.ms);
    return { operacion, n: lista.length, errores: lista.filter((m) => m.estado >= 400).length, p50: percentil(ms, 50), p95: percentil(ms, 95), max: Math.max(...ms) };
  }).sort((a, b) => b.p95 - a.p95);
  const todas = mediciones.map((m) => m.ms);
  const resumen = {
    fecha: new Date().toISOString(),
    base: DB,
    registros: datos.registros,
    usuarios: ROLES.length,
    iteraciones: ITERACIONES,
    peticiones: mediciones.length,
    duracion_s: (Date.now() - inicio) / 1000,
    errores: mediciones.filter((m) => m.estado >= 400).length,
    p50_ms: percentil(todas, 50),
    p95_ms: percentil(todas, 95),
    max_ms: Math.max(...todas),
    umbral_p95_ms: UMBRAL_P95_MS,
    operaciones: filas,
  };

  console.log("\nOperación                        n   err   p50 ms   p95 ms   máx ms");
  for (const f of filas) {
    console.log(`${f.operacion.padEnd(30)} ${String(f.n).padStart(3)} ${String(f.errores).padStart(5)} ${f.p50.toFixed(0).padStart(8)} ${f.p95.toFixed(0).padStart(8)} ${f.max.toFixed(0).padStart(8)}`);
  }
  console.log(`\nTotal: ${resumen.peticiones} peticiones en ${resumen.duracion_s.toFixed(1)} s · p50 ${resumen.p50_ms.toFixed(0)} ms · p95 ${resumen.p95_ms.toFixed(0)} ms · máx ${resumen.max_ms.toFixed(0)} ms · errores ${resumen.errores}`);
  if (salidaJson) fs.writeFileSync(salidaJson, JSON.stringify(resumen, null, 2));

  const cumple = resumen.p95_ms <= UMBRAL_P95_MS && resumen.errores === 0;
  console.log(cumple ? `RNF-004 CUMPLE: p95 ≤ ${UMBRAL_P95_MS} ms y sin errores.` : `RNF-004 NO CUMPLE (umbral p95 ${UMBRAL_P95_MS} ms, errores 0).`);
  process.exitCode = cumple ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
