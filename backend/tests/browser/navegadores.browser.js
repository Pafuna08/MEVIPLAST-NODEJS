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
      "INSERT INTO inventario (producto, familia, medida, calibre, color, cantidad) VALUES (?, ?, '10 x 15', '2', 'Transparente', 100000)",
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
    env: { ...process.env, DB_NAME: DB, PORT: String(PUERTO), JWT_SECRET: "browser-only-secret", CORS_ORIGINS: "", LOG_DIR: "off" },
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

// Los registros que mueven inventario o dinero piden confirmación con un resumen antes de guardar
async function guardarConConfirmacion(pagina, form) {
  await form.locator("button[type=submit]").click();
  const ventana = pagina.locator(".confirm-modal", { has: pagina.locator(".confirm-summary") });
  await ventana.waitFor({ timeout: 10000 });
  await ventana.locator(".confirm-delete").click();
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
    // Cerrar sesión pide confirmación: Cancelar la mantiene y la confirmación lleva al login
    await pagina.click(".sidebar-footer button");
    await pagina.click(".confirm-modal .confirm-cancel");
    if (!pagina.url().includes("dashboard.html")) throw new Error("Cancelar cerró la sesión");
    await pagina.click(".sidebar-footer button");
    await Promise.all([pagina.waitForURL(/login\.html/), pagina.click(".confirm-modal .confirm-delete")]);
    await contexto.close();
    if (problemas.length) throw new Error(problemas.join("; "));
    return `${VISTAS[rol].length} vistas y cierre de sesión`;
  }]),
  ["Vendedor: registrar venta y comprobante", async (navegador, nombre) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await iniciarSesion(pagina, "vendedor");
    const form = formulario(pagina, "Nueva venta");
    // Sin el atributo required: el panel avisa del campo vacío y no abre la confirmación
    await form.locator("button[type=submit]").click();
    await form.locator(".form-error", { hasText: "Cliente" }).waitFor({ timeout: 10000 });
    if (await pagina.locator(".confirm-modal").count()) throw new Error("se abrió la confirmación con campos vacíos");
    for (const selector of ["select[name=inventario_id]", "select[name=unidades_paquete]"]) {
      if ((await form.locator(selector).inputValue()) !== "") problemas.push(`${selector} llega con una opción elegida`);
    }
    await pagina.locator(".product-family-card").filter({ hasText: /[1-9][\d.]* unidades en stock/ }).first().click();
    await pagina.locator(".reference-option").first().click();
    await form.locator("input[name=cliente]").fill(`Cliente ${nombre}`);
    // CR-018: el paquete se elige de la lista (50, 100 o 500) y la venta tiene topes; sin el atributo max,
    // el panel avisa que admite como máximo 1.000 paquetes
    const tamanos = await form.locator("select[name=unidades_paquete] option").allInnerTexts();
    if (tamanos.join("|") !== "Selecciona las unidades|50 unidades|100 unidades|500 unidades") problemas.push(`tamaños de paquete: ${tamanos.join(", ")}`);
    await form.locator("select[name=unidades_paquete]").selectOption("50");
    await form.locator("input[name=cantidad_paquetes]").fill("1001");
    await form.locator("input[name=precio_paquete]").fill("1500");
    const agregar = form.locator("button", { hasText: "Agregar a la venta" });
    await agregar.click();
    await form.locator(".form-error", { hasText: "1.000" }).waitFor({ timeout: 10000 });
    await form.locator("input[name=cantidad_paquetes]").fill("2");
    await agregar.click();
    // CR-022: un segundo producto de otra línea en la misma venta
    await pagina.locator(".product-family-card").filter({ hasText: /[1-9][\d.]* unidades en stock/ }).nth(1).click();
    await pagina.locator(".reference-option").first().click();
    await form.locator("select[name=unidades_paquete]").selectOption("100");
    await form.locator("input[name=cantidad_paquetes]").fill("1");
    await form.locator("input[name=precio_paquete]").fill("9000");
    await agregar.click();
    const filasCarrito = form.locator(".sale-cart tbody tr");
    if ((await filasCarrito.count()) !== 2) problemas.push(`el carrito tiene ${await filasCarrito.count()} productos`);
    if (!(await form.locator(".sale-cart tfoot").innerText()).includes("12.000")) problemas.push("el total del carrito no es $12.000");
    // «Revisar» cierra la confirmación sin guardar: no se abre el comprobante
    await form.locator("button[type=submit]").click();
    const resumen = await pagina.locator(".confirm-modal .confirm-summary").innerText();
    if (!resumen.includes("Producto 2")) problemas.push("la confirmación no lista los dos productos");
    await pagina.locator(".confirm-modal .confirm-cancel").click();
    if (await pagina.locator(".receipt").count()) throw new Error("Revisar guardó la venta");
    await guardarConConfirmacion(pagina, form);
    const comprobante = pagina.locator(".receipt");
    await comprobante.waitFor({ timeout: 10000 });
    if ((await comprobante.locator(".receipt-table tbody tr").count()) !== 2) problemas.push("el comprobante no tiene los dos productos");
    const numero = await comprobante.locator(".receipt-number span").innerText();
    if (!/V-\d{6}/.test(numero)) throw new Error(`número de comprobante: ${numero}`);
    await comprobante.locator("text=Cerrar").click();
    await contexto.close();
    if (problemas.length) throw new Error(problemas.join("; "));
    return `comprobante ${numero.replace("N.º ", "")} con 2 productos`;
  }],
  ["Teclado: ventanas de confirmación y comprobante (RNF-012)", async (navegador) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await iniciarSesion(pagina, "vendedor");
    const dentro = () => pagina.evaluate(() => !!globalThis.document.activeElement?.closest(".confirm-modal"));
    const foco = () => pagina.evaluate(() => globalThis.document.activeElement?.textContent?.trim() || "");
    // Se abre con Enter, el foco entra, Tab y Mayús+Tab no salen, Esc cierra y el foco vuelve al botón
    async function revisarVentana(nombre, boton, ventana) {
      await boton.focus();
      await pagina.keyboard.press("Enter");
      await pagina.locator(ventana).waitFor({ timeout: 10000 });
      if (!(await dentro())) problemas.push(`${nombre}: el foco no entra en la ventana`);
      for (const tecla of ["Tab", "Tab", "Tab", "Tab", "Shift+Tab", "Shift+Tab", "Shift+Tab"]) {
        await pagina.keyboard.press(tecla);
        if (!(await dentro())) { problemas.push(`${nombre}: ${tecla} saca el foco de la ventana`); break; }
      }
      const texto = (await boton.textContent()).trim();
      await pagina.keyboard.press("Escape");
      await pagina.locator(ventana).waitFor({ state: "detached", timeout: 3000 }).catch(() => problemas.push(`${nombre}: Esc no cierra la ventana`));
      if ((await foco()) !== texto) problemas.push(`${nombre}: al cerrar, el foco no vuelve a «${texto}»`);
    }
    await revisarVentana("cerrar sesión", pagina.locator(".logout-button, button", { hasText: "Cerrar sesión" }).first(), ".confirm-modal");
    await pagina.locator("tr", { hasText: "Cliente" }).locator("button", { hasText: "Ver" }).first().waitFor({ timeout: 10000 });
    await revisarVentana("comprobante", pagina.locator("tr", { hasText: "Cliente" }).locator("button", { hasText: "Ver" }).first(), ".receipt");
    await contexto.close();
    if (problemas.length) throw new Error(problemas.join("; "));
    return "Esc cierra, el foco queda dentro y vuelve al botón";
  }],
  ["Operario: registrar avance de producción", async (navegador) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await iniciarSesion(pagina, "operario");
    // Mis tareas → «Registrar avance» abre el formulario con esa orden elegida
    await pagina.goto(`${URL_BASE}/dashboard.html#tareas`);
    await pagina.waitForLoadState("networkidle");
    const primera = pagina.locator(".task-row").first();
    const ordenId = (await primera.locator("strong").innerText()).match(/#(\d+)/)[1];
    await Promise.all([pagina.waitForURL(/#registrar$/), primera.locator("text=Registrar avance").click()]);
    await pagina.waitForLoadState("networkidle");
    const form = formulario(pagina, "Nuevo registro");
    // La orden elegida en Mis tareas queda fija: sin selector para no registrar en otra por error
    if ((await form.locator("input[type=hidden][name=id]").inputValue()) !== ordenId) throw new Error("la orden elegida en Mis tareas no quedó fija");
    if (await form.locator("select[name=id]").count()) problemas.push("la orden elegida todavía se puede cambiar");
    const nota = `NAV-${ordenId}-${Date.now()}`;
    await form.locator("input[name=cantidad]").fill("5");
    await form.locator("textarea[name=observaciones]").fill(nota);
    await guardarConConfirmacion(pagina, form);
    await esperarAviso(pagina, "Registro guardado");
    // Mi historial → «Hoy» muestra el avance con su observación
    await pagina.goto(`${URL_BASE}/dashboard.html#historial`);
    await pagina.locator(".report-period-button", { hasText: "Hoy" }).click();
    await pagina.locator("td", { hasText: nota }).waitFor({ timeout: 10000 });
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
    // Ningún selector llega con una opción elegida: se muestra «Selecciona…»
    for (const nombre of ["materia_prima_id", "tipo"]) {
      if ((await form.locator(`select[name=${nombre}]`).inputValue()) !== "") problemas.push(`${nombre} llega con una opción elegida`);
    }
    if (await form.locator("option[value=__crear__]").count()) problemas.push("el almacenista ve «Crear nuevo material»");
    await form.locator("select[name=materia_prima_id]").selectOption({ index: 1 });
    await form.locator("select[name=tipo]").selectOption("compra");
    await form.locator("input[name=cantidad]").fill("25");
    await form.locator("input[name=observaciones]").fill("Remisión de prueba");
    await guardarConConfirmacion(pagina, form);
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
    await form.locator("select[name=materia_prima_id]").selectOption({ index: 1 });
    await form.locator("select[name=tipo]").selectOption("ajuste_salida");
    // Mayor que el saldo pero dentro del tope de 100.000 kg (DEF-022)
    await form.locator("input[name=cantidad]").fill("99999");
    await guardarConConfirmacion(pagina, form);
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
    await form.locator("select[name=materia_prima_id]").selectOption({ index: 1 });
    await form.locator("select[name=tipo]").selectOption("consumo_produccion");
    const orden = await form.locator("select[name=produccion_id] option").nth(1).innerText().catch(() => "ninguna");
    if (!orden.startsWith("#")) throw new Error(`sin órdenes para consumir: ${orden}`);
    await form.locator("select[name=produccion_id]").selectOption({ index: 1 });
    await form.locator("input[name=cantidad]").fill("5");
    await guardarConConfirmacion(pagina, form);
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
    await form.locator("select[name=color]").selectOption("Blanco");
    await form.locator("input[name=cantidad]").fill("300");
    await guardarConConfirmacion(pagina, form);
    await esperarAviso(pagina, "Registro guardado");
    // CR-019: con Cargadera la medida se elige entre sus tallas; al volver a otra línea, se escribe
    await form.locator("select[name=familia]").selectOption("Cargadera");
    await form.locator("select[name=medida]").waitFor({ timeout: 5000 });
    const tallas = await form.locator("select[name=medida] option").allInnerTexts();
    if (tallas.join("|") !== "Selecciona la talla|T15|T20|T25|T30") problemas.push(`tallas de Cargadera: ${tallas.join(", ")}`);
    await form.locator("select[name=medida]").selectOption("T25");
    await form.locator("input[name=calibre]").fill("2");
    await form.locator("select[name=color]").selectOption("Blanco");
    await form.locator("input[name=cantidad]").fill("10");
    await guardarConConfirmacion(pagina, form);
    await esperarAviso(pagina, "Registro guardado");
    await form.locator("select[name=familia]").selectOption("Sencilla PP");
    await form.locator("input[name=medida]").waitFor({ timeout: 5000 }).catch(() => problemas.push("al cambiar de línea no vuelve el campo ancho x largo"));
    await contexto.close();
    if (problemas.length) throw new Error(problemas.join("; "));
    return "ingreso guardado, también de Cargadera en talla T25";
  }],
  ["Administrador: crear línea y material desde los selectores (CR-020)", async (navegador, nombre) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await iniciarSesion(pagina, "admin");
    await pagina.goto(`${URL_BASE}/dashboard.html#produccion`);
    await pagina.waitForLoadState("networkidle");
    const form = formulario(pagina, "Nueva orden de producción");
    const producto = form.locator("select[name=producto]");
    const ventana = pagina.locator(".create-modal");
    // Esc cierra la ventana sin crear y el selector queda en «Selecciona una línea»
    await producto.selectOption("__crear__");
    await ventana.waitFor({ timeout: 10000 });
    await pagina.keyboard.press("Escape");
    await ventana.waitFor({ state: "hidden", timeout: 10000 });
    if ((await producto.inputValue()) !== "") problemas.push("tras cancelar, el selector no volvió a «Selecciona»");
    // Línea nueva (una por navegador, porque comparten la base): queda elegida y se mide en ancho x largo
    const linea = `Bolsa ${nombre}`;
    await producto.selectOption("__crear__");
    // Espacios de más y minúscula inicial: se guarda limpio, con mayúscula inicial
    await ventana.locator("input[name=nombre]").fill(`  bolsa   ${nombre} `);
    await ventana.locator("button[type=submit]").click();
    await ventana.waitFor({ state: "hidden", timeout: 10000 });
    if ((await producto.inputValue()) !== linea) problemas.push(`la línea nueva no quedó elegida (${await producto.inputValue()})`);
    await form.locator("input[name=medida]").waitFor({ timeout: 10000 });
    // Material nuevo: mismas reglas de «Registrar material»; queda elegido
    const medida = { Edge: "61 x 91", Chrome: "62 x 92", Firefox: "63 x 93" }[nombre] || "64 x 94";
    const materia = form.locator("select[name=materia_prima_id]");
    await materia.selectOption("__crear__");
    await ventana.waitFor({ timeout: 10000 });
    await ventana.locator("select[name=tipo]").selectOption("PEBD");
    await ventana.locator("input[name=medida]").fill("abc");
    await ventana.locator("input[name=calibre]").fill("2");
    await ventana.locator("select[name=color]").selectOption("Rojo");
    await ventana.locator("input[name=peso_rollo]").fill("40");
    await ventana.locator("button[type=submit]").click();
    // Una medida inventada no pasa: la ventana sigue abierta con el aviso
    await ventana.locator(".form-error").waitFor({ timeout: 10000 });
    await ventana.locator("input[name=medida]").fill(medida);
    await ventana.locator("button[type=submit]").click();
    await ventana.waitFor({ state: "hidden", timeout: 10000 });
    const elegida = await materia.locator("option:checked").textContent();
    if (!elegida.includes(medida)) problemas.push(`el material nuevo no quedó elegido (${elegida})`);
    // La orden con la línea y el material nuevos se guarda
    await form.locator("input[name=medida]").fill("20 x 30");
    await form.locator("input[name=calibre]").fill("2");
    await form.locator("select[name=color]").selectOption("Rojo");
    await form.locator("input[name=cantidad]").fill("10");
    await form.locator("select[name=prioridad]").selectOption("media");
    await form.locator("button[type=submit]").click();
    await esperarAviso(pagina, "Registro guardado");
    await pagina.locator(".orders-table tbody tr", { hasText: linea }).first().waitFor({ timeout: 10000 });
    await contexto.close();
    if (problemas.length) throw new Error(problemas.join("; "));
    return `línea «${linea}» y bobina ${medida} creadas y usadas en una orden`;
  }],
  ["Administrador: órdenes en tabla con detalle en ventana", async (navegador, nombre) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await iniciarSesion(pagina, "admin");
    await pagina.goto(`${URL_BASE}/dashboard.html#produccion`);
    await pagina.waitForLoadState("networkidle");
    // Orden propia de este navegador (la base es compartida): la meta la distingue
    const meta = { Edge: "111", Chrome: "222", Firefox: "333" }[nombre] || "444";
    const form = formulario(pagina, "Nueva orden de producción");
    await form.locator("select[name=producto]").selectOption("Sencilla PP");
    await form.locator("input[name=medida]").fill("6 x 9");
    await form.locator("input[name=calibre]").fill("1");
    await form.locator("select[name=color]").selectOption("Natural");
    await form.locator("input[name=cantidad]").fill(meta);
    await form.locator("select[name=materia_prima_id]").selectOption({ index: 1 });
    await form.locator("select[name=prioridad]").selectOption("baja");
    await form.locator("button[type=submit]").click();
    await esperarAviso(pagina, "Registro guardado");
    // La lista es una tabla sin botones de acción por fila
    const fila = pagina.locator(".orders-table tbody tr", { has: pagina.locator(`[title="0 de ${meta}"]`) }).first();
    await fila.waitFor({ timeout: 10000 });
    if (await pagina.locator(".orders-table button", { hasText: /Cancelar|Editar/ }).count()) problemas.push("la tabla todavía tiene botones de acción");
    // Clic en la fila: ventana con el detalle y las acciones de una orden pendiente sin operario
    await fila.click();
    const ventana = pagina.locator(".order-modal");
    await ventana.waitFor({ timeout: 10000 });
    const texto = await ventana.textContent();
    for (const esperado of ["Sencilla PP · 6 x 9 · calibre 1 · Natural", `${meta} unidades`, "Pendiente para los supervisores", "Asignar operario"]) {
      if (!texto.includes(esperado)) problemas.push(`el detalle no muestra «${esperado}»`);
    }
    for (const boton of ["Cancelar orden", "Editar", "Cerrar"]) {
      if (!(await ventana.locator("button", { hasText: boton }).count())) problemas.push(`falta el botón «${boton}»`);
    }
    // Editar dentro de la ventana y volver; Esc la cierra
    await ventana.locator("button", { hasText: "Editar" }).click();
    await ventana.locator("form[aria-label^='Editar orden'] input[name=cantidad]").waitFor({ timeout: 10000 });
    await ventana.locator("button", { hasText: "Volver al detalle" }).click();
    await pagina.keyboard.press("Escape");
    await ventana.waitFor({ state: "hidden", timeout: 10000 });
    // Cancelar desde la ventana: pide confirmación y la orden pasa al filtro «Canceladas»
    await fila.locator(".link-button").click();
    await ventana.locator("button", { hasText: "Cancelar orden" }).click();
    await pagina.locator(".confirm-modal button", { hasText: "Sí, cancelar la orden" }).click();
    await esperarAviso(pagina, "Estado actualizado");
    await pagina.locator(".filter-chip", { hasText: "Canceladas" }).click();
    await pagina.locator(".orders-table tbody tr", { has: pagina.locator(`[title="0 de ${meta}"]`) }).first().waitFor({ timeout: 10000 });
    await contexto.close();
    if (problemas.length) throw new Error(problemas.join("; "));
    return `orden de ${meta} vista, editada y cancelada desde la ventana`;
  }],
  ["Administrador: comprobante desde el reporte de ventas", async (navegador) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await iniciarSesion(pagina, "admin");
    await pagina.goto(`${URL_BASE}/dashboard.html?reporte=ventas&periodo=anual`);
    await pagina.waitForLoadState("networkidle");
    const detalle = pagina.locator("section.panel", { has: pagina.locator("h3", { hasText: "Detalle de ventas" }) });
    const fila = detalle.locator("tbody tr.clickable-row").first();
    await fila.waitFor({ timeout: 10000 });
    const cliente = (await fila.locator("td").nth(1).textContent()).trim();
    // Clic en la fila: se abre el comprobante de esa venta, listo para imprimir o guardar en PDF
    await fila.click();
    const comprobante = pagina.locator(".receipt");
    await comprobante.waitFor({ timeout: 10000 });
    const texto = await comprobante.textContent();
    if (!/N\.º V-\d{6}/.test(texto)) problemas.push("el comprobante no muestra su número");
    if (!texto.includes(cliente)) problemas.push(`el comprobante no es de la venta elegida (${cliente})`);
    if (!(await comprobante.locator("button", { hasText: "Imprimir / guardar PDF" }).count())) problemas.push("falta el botón de imprimir");
    await pagina.keyboard.press("Escape");
    await comprobante.waitFor({ state: "hidden", timeout: 10000 });
    // También con el botón «Ver» de la última columna
    await fila.locator("button", { hasText: "Ver" }).click();
    await comprobante.waitFor({ timeout: 10000 });
    await contexto.close();
    if (problemas.length) throw new Error(problemas.join("; "));
    return `comprobante de «${cliente}» abierto desde el reporte`;
  }],
  ["Administrador: reporte y descarga a Excel", async (navegador) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await iniciarSesion(pagina, "admin");
    await pagina.goto(`${URL_BASE}/dashboard.html?reporte=ventas&periodo=mensual`);
    await pagina.waitForLoadState("networkidle");
    const [descarga] = await Promise.all([pagina.waitForEvent("download"), pagina.click("text=Descargar Excel")]);
    const nombre = descarga.suggestedFilename();
    const tam = fs.statSync(await descarga.path()).size;
    // Desde el reporte, el menú lleva a otra sección (antes se quedaba en el reporte)
    await Promise.all([pagina.waitForURL(/dashboard\.html#usuarios$/), pagina.click(".sidebar nav >> text=Usuarios")]);
    await pagina.locator(".page-intro h2", { hasText: "Usuarios" }).waitFor({ timeout: 10000 });
    // DEF-021: en la fila propia no se ofrece desactivar ni eliminar
    const filaPropia = pagina.locator("tr", { has: pagina.locator(".own-account") });
    await filaPropia.waitFor({ timeout: 10000 });
    if (await filaPropia.locator("button", { hasText: /Desactivar|Eliminar/ }).count()) problemas.push("la fila propia ofrece desactivar o eliminar");
    await contexto.close();
    if (!/^reporte-ventas-mensual-\d{4}-\d{2}-\d{2}\.xlsx$/.test(nombre) || tam < 1000) throw new Error(`descarga ${nombre} (${tam} bytes)`);
    if (problemas.length) throw new Error(problemas.join("; "));
    return `${nombre} (${tam} bytes)`;
  }],
  ["Supervisor: rendimiento de operarios (HU-022)", async (navegador) => {
    const { contexto, pagina, problemas } = await nuevaPagina(navegador);
    await iniciarSesion(pagina, "supervisor");
    // CR-021: el supervisor no ve ventas: ni en su Inicio ni en Reportes
    await pagina.locator(".stat-card").first().waitFor({ timeout: 10000 });
    if (await pagina.locator(".stat-card", { hasText: "Ventas" }).count()) problemas.push("el Inicio del supervisor muestra ventas");
    await pagina.goto(`${URL_BASE}/dashboard.html#reportes`);
    await pagina.waitForLoadState("networkidle");
    if (await pagina.locator(".report-category", { hasText: "ventas" }).count()) problemas.push("el supervisor ve el reporte de ventas");
    const tarjeta = pagina.locator(".report-category", { hasText: "rendimiento de operarios" });
    await Promise.all([
      pagina.waitForURL(/reporte=rendimiento&periodo=mensual/),
      tarjeta.locator("button", { hasText: "Mensual" }).click(),
    ]);
    const filaOperario = pagina.locator("tr", { hasText: "Navegador operario" });
    await filaOperario.waitFor({ timeout: 10000 });
    const cumplimiento = (await filaOperario.locator(".performance-cell strong").textContent()).trim();
    if (!/^\d+(,\d)? %$/.test(cumplimiento)) throw new Error(`cumplimiento «${cumplimiento}»`);
    const [descarga] = await Promise.all([pagina.waitForEvent("download"), pagina.click("text=Descargar Excel")]);
    const nombre = descarga.suggestedFilename();
    await contexto.close();
    if (!/^reporte-rendimiento-mensual-\d{4}-\d{2}-\d{2}\.xlsx$/.test(nombre)) throw new Error(`descarga ${nombre}`);
    if (problemas.length) throw new Error(problemas.join("; "));
    return `operario al ${cumplimiento}; ${nombre}`;
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
