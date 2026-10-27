// Prueba de compatibilidad de RNF-007: flujos críticos del panel en Edge, Chrome y Firefox.
// Requisitos (una vez): npm run build --prefix frontend
//                       cd backend && npx playwright-core install chromium firefox
// Uso: npm run test:browser --prefix backend [-- --json <archivo>]
// Usa una base desechable (BROWSER_DB_NAME, por defecto meviplast_browser) y la API
// como proceso aparte. Edge debe estar instalado en el equipo. Nunca apunta a meviplast_db.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const { chromium, firefox } = require("playwright-core");
const { leerEsquema } = require("../../src/config/schema");
const { productosTerminados } = require("../../src/constants/productosTerminados");

const DB = process.env.BROWSER_DB_NAME || "meviplast_browser";
if (!/^meviplast_browser\w*$/.test(DB)) {
  throw new Error(`BROWSER_DB_NAME debe empezar por "meviplast_browser" (recibido: ${DB})`);
}
const PUERTO = Number(process.env.BROWSER_PORT) || 3996;
const URL_BASE = `http://127.0.0.1:${PUERTO}`;
const CLAVE = "Browser-clave-123";
const ROLES = ["admin", "supervisor", "operario", "vendedor", "almacenista"];
const VISTAS = {
  admin: ["inicio", "usuarios", "materia", "inventario", "produccion", "ventas", "reportes", "auditoria"],
  supervisor: ["inicio", "asignar", "operarios", "produccion", "materia", "reportes"],
  operario: ["inicio", "tareas", "registrar", "historial"],
  vendedor: ["ventas"],
  almacenista: ["materia", "inventario"],
};
const NAVEGADORES = [
  ["Edge", () => chromium.launch({ channel: "msedge" })],
  ["Chrome", () => chromium.launch({ channel: "chromium" })],
  ["Firefox", () => firefox.launch()],
];
const salidaJson = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
const conexion = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  multipleStatements: true,
};
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function prepararBase() {
  const raiz = await mysql.createConnection(conexion);
  await raiz.query(`DROP DATABASE IF EXISTS \`${DB}\``);
  await raiz.query(`CREATE DATABASE \`${DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await raiz.changeUser({ database: DB });
  await raiz.query(leerEsquema());
  const hash = await bcrypt.hash(CLAVE, 4);
  const ids = {};
  for (const rol of ROLES) {
    const [r] = await raiz.query(
      "INSERT INTO usuarios (nombre, usuario, correo, password_hash, rol) VALUES (?, ?, ?, ?, ?)",
      [`Navegador ${rol}`, `nav_${rol}`, `nav_${rol}@example.test`, hash, rol],
    );
    ids[rol] = r.insertId;
  }
  const [bobina] = await raiz.query("INSERT INTO materia_prima (nombre, tipo, medida, calibre, color, cantidad, stock_minimo) VALUES ('PEBD 10 x 15', 'PEBD', '10 x 15', '2', 'Transparente', 500, 50)");
  for (const familia of productosTerminados) {
    await raiz.query(
      "INSERT INTO inventario (producto, familia, medida, calibre, color, cantidad, ubicacion) VALUES (?, ?, '10 x 15', '2', 'Transparente', 100000, 'Bodega')",
      [`${familia} · 10 x 15 · calibre 2 · Transparente`, familia],
    );
  }
  // Una orden en proceso por navegador, que usa la bobina: el operario registra avance y el supervisor consumo
  for (let i = 0; i < NAVEGADORES.length; i += 1) {
    await raiz.query(
      "INSERT INTO produccion (producto, cantidad, materia_prima_id, supervisor_id, responsable_id, estado) VALUES ('Cargadera', 100000, ?, ?, ?, 'en_proceso')",
      [bobina.insertId, ids.supervisor, ids.operario],
    );
  }
  return raiz;
}

// Los errores de la API se guardan en un archivo para poder diagnosticar si se cae a mitad de la prueba
const LOG_API = path.join(require("node:os").tmpdir(), "meviplast-browser-api.log");

async function levantarApi() {
  const log = fs.openSync(LOG_API, "w");
  const proceso = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, "..", ".."),
    env: { ...process.env, DB_NAME: DB, PORT: String(PUERTO), JWT_SECRET: "browser-only-secret", CORS_ORIGINS: "" },
    stdio: ["ignore", log, log],
  });
  proceso.on("exit", (codigo) => {
    if (codigo !== null) console.error(`   La API terminó con código ${codigo}; revisa ${LOG_API}`);
  });
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(`${URL_BASE}/api/health`)).ok) return proceso;
    } catch {
      // la API todavía no escucha
    }
    await esperar(250);
  }
  proceso.kill();
  throw new Error("La API no respondió en 15 s");
}

// Abre un contexto que registra errores de JavaScript y respuestas de la API con error
async function nuevaPagina(navegador, opciones = {}) {
  const contexto = await navegador.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...opciones });
  const pagina = await contexto.newPage();
  const problemas = [];
  pagina.on("pageerror", (error) => problemas.push(`JS: ${error.message}`));
  pagina.on("response", (r) => {
    if (r.url().includes("/api/") && r.status() >= 400) problemas.push(`API ${r.status()} ${new URL(r.url()).pathname}`);
  });
  return { contexto, pagina, problemas };
}

async function iniciarSesion(pagina, rol) {
  await pagina.goto(`${URL_BASE}/login.html`);
  await pagina.fill("#username", `nav_${rol}`);
  await pagina.fill("#password", CLAVE);
  await Promise.all([pagina.waitForURL(/dashboard\.html/), pagina.click("button[type=submit]")]);
  await pagina.waitForSelector(".main-content");
}

async function esperarAviso(pagina, texto) {
  await pagina.locator(".toast.show", { hasText: texto }).waitFor({ timeout: 10000 });
}

const formulario = (pagina, titulo) => pagina.locator("section.form-panel", { has: pagina.locator("h3", { hasText: titulo }) });

// Flujos críticos. Cada uno recibe el navegador y su nombre, y devuelve un detalle corto.
const FLUJOS = [
  ["Sitio público e inicio de sesión fallido", async (navegador) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await pagina.goto(`${URL_BASE}/index.html`);
    if (!(await pagina.title()).includes("MEVIPLAST")) throw new Error("título del sitio público");
    await pagina.goto(`${URL_BASE}/login.html`);
    await pagina.fill("#username", "nav_vendedor");
    await pagina.fill("#password", "clave-erronea");
    await pagina.click("button[type=submit]");
    await pagina.locator("#login-status", { hasText: /incorrect/i }).waitFor({ timeout: 10000 });
    await contexto.close();
    // El 401 del login fallido es el resultado esperado
    const otros = problemas.filter((p) => p !== "API 401 /api/auth/login");
    if (otros.length) throw new Error(otros.join("; "));
    return "sitio carga; el login fallido muestra el mensaje";
  }],
  ...ROLES.map((rol) => [`Vistas del rol ${rol}`, async (navegador) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await iniciarSesion(pagina, rol);
    for (const vista of VISTAS[rol]) {
      await pagina.goto(`${URL_BASE}/dashboard.html#${vista}`);
      await pagina.waitForLoadState("networkidle");
      const texto = (await pagina.locator(".main-content").innerText()).trim();
      if (!texto || /No se pudo cargar/i.test(texto)) throw new Error(`vista ${vista} vacía o con error`);
    }
    await Promise.all([pagina.waitForURL(/login\.html/), pagina.click("text=Cerrar sesión")]);
    await contexto.close();
    if (problemas.length) throw new Error(problemas.join("; "));
    return `${VISTAS[rol].length} vistas y cierre de sesión`;
  }]),
  ["Vendedor: registrar venta y comprobante", async (navegador, nombre) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await iniciarSesion(pagina, "vendedor");
    const form = formulario(pagina, "Nueva venta");
    await form.locator("input[name=cliente]").fill(`Cliente ${nombre}`);
    await form.locator("input[name=unidades_paquete]").fill("50");
    await form.locator("input[name=cantidad_paquetes]").fill("2");
    await form.locator("input[name=precio_paquete]").fill("1500");
    await form.locator("button[type=submit]").click();
    const comprobante = pagina.locator(".receipt");
    await comprobante.waitFor({ timeout: 10000 });
    const numero = await comprobante.locator(".receipt-number span").innerText();
    if (!/V-\d{6}/.test(numero)) throw new Error(`número de comprobante: ${numero}`);
    await comprobante.locator("text=Cerrar").click();
    await contexto.close();
    if (problemas.length) throw new Error(problemas.join("; "));
    return `comprobante ${numero.replace("N.º ", "")}`;
  }],
  ["Operario: registrar avance de producción", async (navegador) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await iniciarSesion(pagina, "operario");
    await pagina.goto(`${URL_BASE}/dashboard.html#registrar`);
    await pagina.waitForLoadState("networkidle");
    const form = formulario(pagina, "Nuevo registro");
    await form.locator("input[name=cantidad]").fill("5");
    await form.locator("input[name=lote]").fill("NAV-01");
    await form.locator("button[type=submit]").click();
    await esperarAviso(pagina, "Registro guardado");
    await contexto.close();
    if (problemas.length) throw new Error(problemas.join("; "));
    return "avance guardado";
  }],
  ["Almacenista: compra de materia prima", async (navegador) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await iniciarSesion(pagina, "almacenista");
    await pagina.goto(`${URL_BASE}/dashboard.html#materia`);
    await pagina.waitForLoadState("networkidle");
    const form = formulario(pagina, "Registrar movimiento");
    await form.locator("select[name=tipo]").selectOption("compra");
    await form.locator("input[name=cantidad]").fill("25");
    await form.locator("input[name=observaciones]").fill("Remisión de prueba");
    await form.locator("button[type=submit]").click();
    await esperarAviso(pagina, "Registro guardado");
    await contexto.close();
    if (problemas.length) throw new Error(problemas.join("; "));
    return "compra guardada";
  }],
  ["Almacenista: ajuste mayor al saldo (rechazo)", async (navegador) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await iniciarSesion(pagina, "almacenista");
    await pagina.goto(`${URL_BASE}/dashboard.html#materia`);
    await pagina.waitForLoadState("networkidle");
    const form = formulario(pagina, "Registrar movimiento");
    await form.locator("select[name=tipo]").selectOption("ajuste_salida");
    await form.locator("input[name=cantidad]").fill("999999");
    await form.locator("button[type=submit]").click();
    await esperarAviso(pagina, "Stock insuficiente");
    await contexto.close();
    // El 400 de la API es el rechazo esperado
    const otros = problemas.filter((p) => p !== "API 400 /api/materia-prima/movimientos");
    if (otros.length) throw new Error(otros.join("; "));
    return "rechazado con «Stock insuficiente»";
  }],
  ["Supervisor: consumo de materia prima en una orden", async (navegador) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await iniciarSesion(pagina, "supervisor");
    await pagina.goto(`${URL_BASE}/dashboard.html#materia`);
    await pagina.waitForLoadState("networkidle");
    const form = formulario(pagina, "Registrar movimiento");
    await form.locator("select[name=tipo]").selectOption("consumo_produccion");
    const orden = await form.locator("select[name=produccion_id] option").first().innerText();
    if (!orden.startsWith("#")) throw new Error(`sin órdenes para consumir: ${orden}`);
    await form.locator("input[name=cantidad]").fill("5");
    await form.locator("button[type=submit]").click();
    await esperarAviso(pagina, "Registro guardado");
    await contexto.close();
    if (problemas.length) throw new Error(problemas.join("; "));
    return `consumo en la orden ${orden.split(" ")[0]}`;
  }],
  ["Almacenista: ingreso de inventario", async (navegador, nombre) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await iniciarSesion(pagina, "almacenista");
    await pagina.goto(`${URL_BASE}/dashboard.html#inventario`);
    await pagina.waitForLoadState("networkidle");
    const form = formulario(pagina, "Ingreso de inventario");
    await form.locator("select[name=familia]").selectOption("Sencilla PP");
    // Una medida distinta por navegador, para crear una variante nueva en cada uno
    await form.locator("input[name=medida]").fill(`8 x ${10 + NAVEGADORES.findIndex(([n]) => n === nombre)}`);
    await form.locator("input[name=calibre]").fill("1");
    await form.locator("input[name=color]").fill("Blanco");
    await form.locator("input[name=cantidad]").fill("300");
    await form.locator("button[type=submit]").click();
    await esperarAviso(pagina, "Registro guardado");
    await contexto.close();
    if (problemas.length) throw new Error(problemas.join("; "));
    return "ingreso guardado";
  }],
  ["Administrador: reporte y descarga a Excel", async (navegador) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await iniciarSesion(pagina, "admin");
    await pagina.goto(`${URL_BASE}/dashboard.html?reporte=ventas&periodo=mensual`);
    await pagina.waitForLoadState("networkidle");
    const [descarga] = await Promise.all([pagina.waitForEvent("download"), pagina.click("text=Descargar Excel")]);
    const nombre = descarga.suggestedFilename();
    const tam = fs.statSync(await descarga.path()).size;
    await contexto.close();
    if (!/^reporte-ventas-mensual-\d{4}-\d{2}-\d{2}\.xlsx$/.test(nombre) || tam < 1000) throw new Error(`descarga ${nombre} (${tam} bytes)`);
    if (problemas.length) throw new Error(problemas.join("; "));
    return `${nombre} (${tam} bytes)`;
  }],
];

async function main() {
  if (!fs.existsSync(path.join(__dirname, "..", "..", "..", "frontend", "dist", "dashboard.html"))) {
    throw new Error("Falta frontend/dist: ejecuta npm run build --prefix frontend");
  }
  console.log(`1. Preparando ${DB}…`);
  const raiz = await prepararBase();
  console.log(`2. Levantando la API en el puerto ${PUERTO}…`);
  const api = await levantarApi();
  const resultados = [];
  try {
    for (const [nombre, abrir] of NAVEGADORES) {
      let navegador;
      try {
        navegador = await abrir();
      } catch (error) {
        resultados.push({ navegador: nombre, version: "—", flujo: "Abrir navegador", ok: false, detalle: error.message.split("\n")[0] });
        continue;
      }
      const version = navegador.version();
      console.log(`3. ${nombre} ${version}`);
      for (const [flujo, ejecutar] of FLUJOS) {
        const inicio = Date.now();
        try {
          const detalle = await ejecutar(navegador, nombre);
          resultados.push({ navegador: nombre, version, flujo, ok: true, detalle, ms: Date.now() - inicio });
        } catch (error) {
          resultados.push({ navegador: nombre, version, flujo, ok: false, detalle: error.message.split("\n")[0], ms: Date.now() - inicio });
        }
        const r = resultados.at(-1);
        console.log(`   ${r.ok ? "OK   " : "FALLA"} ${flujo} — ${r.detalle}`);
      }
      await navegador.close();
    }
  } finally {
    api.kill();
    if (process.env.BROWSER_KEEP_DB !== "true") await raiz.query(`DROP DATABASE IF EXISTS \`${DB}\``);
    await raiz.end();
  }

  const fallas = resultados.filter((r) => !r.ok);
  console.log(`\n${resultados.length - fallas.length} de ${resultados.length} flujos sin bloqueo.`);
  if (salidaJson) fs.writeFileSync(salidaJson, JSON.stringify({ fecha: new Date().toISOString(), resultados }, null, 2));
  console.log(fallas.length ? "RNF-007 NO CUMPLE." : "RNF-007 CUMPLE: 100 % de los flujos críticos sin bloqueo.");
  process.exitCode = fallas.length ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
