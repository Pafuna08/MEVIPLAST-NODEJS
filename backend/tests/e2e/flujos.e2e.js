// Pruebas extremo a extremo contra una base MySQL/MariaDB real y desechable.
// Uso: npm run test:e2e --prefix backend
// Crea la base E2E_DB_NAME (por defecto meviplast_e2e), ejecuta los flujos y la elimina.
// Nunca apunta a meviplast_db: el nombre debe empezar por "meviplast_e2e".
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { once } = require("node:events");
const bcrypt = require("bcryptjs");
const ExcelJS = require("exceljs");
const mysql = require("mysql2/promise");
const { leerEsquema } = require("../../src/config/schema");

const DB = process.env.E2E_DB_NAME || "meviplast_e2e";
if (!/^meviplast_e2e\w*$/.test(DB)) {
  throw new Error(`E2E_DB_NAME debe empezar por "meviplast_e2e" (recibido: ${DB})`);
}
process.env.DB_NAME = DB;
process.env.JWT_SECRET = "e2e-only-secret";
process.env.LOGIN_MAX_INTENTOS = "5";
process.env.LOGIN_BLOQUEO_MINUTOS = "15";

const conexion = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  multipleStatements: true,
};
const CLAVE = "E2e-clave-123";
const ROLES = ["admin", "supervisor", "operario", "vendedor", "almacenista"];
const sqlDir = path.join(__dirname, "..", "..", "sql");

async function prepararBase() {
  const raiz = await mysql.createConnection(conexion);
  await raiz.query(`DROP DATABASE IF EXISTS \`${DB}\``);
  await raiz.query(`CREATE DATABASE \`${DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await raiz.changeUser({ database: DB });
  await raiz.query(leerEsquema());
  const hash = await bcrypt.hash(CLAVE, 4);
  for (const rol of ROLES) {
    await raiz.query(
      "INSERT INTO usuarios (nombre, usuario, correo, password_hash, rol) VALUES (?, ?, ?, ?, ?)",
      [`E2E ${rol}`, `e2e_${rol}`, `e2e_${rol}@example.test`, hash, rol],
    );
  }
  return raiz;
}

test("flujos E2E de MEVIPLAST contra MySQL", async (t) => {
  const db = await prepararBase();
  const app = require("../../src/app");
  const { pool } = require("../../src/config/database");
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
    if (process.env.E2E_KEEP_DB !== "true") await db.query(`DROP DATABASE IF EXISTS \`${DB}\``);
    await db.end();
  });

  async function llamar(metodo, ruta, token, cuerpo) {
    const respuesta = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const texto = await respuesta.text();
    return { status: respuesta.status, body: texto ? JSON.parse(texto) : null };
  }
  const login = (usuario, password = CLAVE) => llamar("POST", "/auth/login", null, { usuario, password });
  const tokens = {};
  const ids = {};
  for (const rol of ROLES) {
    const r = await login(`e2e_${rol}`);
    assert.equal(r.status, 200, `login de ${rol}`);
    tokens[rol] = r.body.token;
    ids[rol] = r.body.usuario.id;
  }

  await t.test("health responde 200 con la base real", async () => {
    const r = await llamar("GET", "/health");
    assert.equal(r.status, 200);
    assert.equal(r.body.baseDatos, "ok");
  });

  await t.test("CP-028: orden → asignación → avance → inventario → venta → reportes", async () => {
    const orden = await llamar("POST", "/produccion", tokens.admin, {
      producto: "Cargadera", cantidad: 1000, prioridad: "alta", supervisor_id: ids.supervisor,
    });
    assert.equal(orden.status, 201, JSON.stringify(orden.body));
    const ordenId = orden.body.id;

    const asignada = await llamar("PUT", `/produccion/${ordenId}/asignar`, tokens.supervisor, { responsable_id: ids.operario });
    assert.equal(asignada.status, 200, JSON.stringify(asignada.body));

    const tareas = await llamar("GET", "/produccion", tokens.operario);
    assert.ok(tareas.body.some((o) => o.id === ordenId), "el operario ve su orden");

    assert.equal((await llamar("PUT", `/produccion/${ordenId}/estado`, tokens.operario, { estado: "en_proceso" })).status, 200);
    const exceso = await llamar("POST", `/produccion/${ordenId}/avance`, tokens.operario, { cantidad: 1500 });
    assert.equal(exceso.status, 400);
    assert.match(exceso.body.mensaje, /supera la meta pendiente/);
    const avance = await llamar("POST", `/produccion/${ordenId}/avance`, tokens.operario, { cantidad: 1000, lote: "E2E-01" });
    assert.equal(avance.status, 200, JSON.stringify(avance.body));
    assert.equal(avance.body.estado, "finalizado");

    const [[stock]] = await db.query("SELECT id, cantidad FROM inventario WHERE familia = 'Cargadera'");
    assert.equal(Number(stock.cantidad), 1000);
    const [[mov]] = await db.query("SELECT COUNT(*) AS n FROM movimientos_inventario WHERE produccion_id = ? AND tipo = 'produccion'", [ordenId]);
    assert.equal(Number(mov.n), 1);

    const venta = await llamar("POST", "/ventas", tokens.vendedor, {
      cliente: "Cliente E2E", inventario_id: stock.id, cantidad_paquetes: 2, unidades_paquete: 250, precio_paquete: 30000,
    });
    assert.equal(venta.status, 201, JSON.stringify(venta.body));
    assert.equal(Number(venta.body.total), 60000);
    const [[despues]] = await db.query("SELECT cantidad FROM inventario WHERE id = ?", [stock.id]);
    assert.equal(Number(despues.cantidad), 500);

    const reporteProd = await llamar("GET", "/reportes/produccion/detalle?periodo=semanal", tokens.supervisor);
    assert.equal(reporteProd.status, 200);
    assert.ok(reporteProd.body.detalle.some((d) => Number(d.orden_id) === ordenId));
    const reporteVentas = await llamar("GET", "/reportes/ventas/detalle?periodo=semanal", tokens.admin);
    assert.equal(reporteVentas.status, 200);
    assert.ok(reporteVentas.body.detalle.some((d) => d.cliente === "Cliente E2E"));

    const ventasVendedor = await llamar("GET", "/ventas", tokens.vendedor);
    assert.ok(ventasVendedor.body.every((v) => v.usuario_id === ids.vendedor));

    // RF-023: comprobante imprimible de la venta
    const comprobante = await llamar("GET", `/ventas/${venta.body.id}/comprobante`, tokens.vendedor);
    assert.equal(comprobante.status, 200, JSON.stringify(comprobante.body));
    assert.equal(comprobante.body.numero, `V-${String(venta.body.id).padStart(6, "0")}`);
    assert.equal(comprobante.body.cliente, "Cliente E2E");
    assert.equal(comprobante.body.familia, "Cargadera");
    assert.equal(Number(comprobante.body.total), 60000);
    assert.equal((await llamar("GET", `/ventas/${venta.body.id}/comprobante`, tokens.admin)).status, 200);
    assert.equal((await llamar("GET", `/ventas/${venta.body.id}/comprobante`, tokens.almacenista)).status, 403);
    assert.equal((await llamar("GET", "/ventas/999999/comprobante", tokens.admin)).status, 404);

    // RF-028: el detalle del periodo se descarga en Excel con los mismos datos
    const descargar = (ruta, token) => fetch(`${base}${ruta}`, { headers: { Authorization: `Bearer ${token}` } });
    const excel = await descargar("/reportes/ventas/detalle/excel?periodo=semanal", tokens.supervisor);
    assert.equal(excel.status, 200);
    assert.match(excel.headers.get("content-type"), /spreadsheetml/);
    assert.match(excel.headers.get("content-disposition"), /reporte-ventas-semanal-\d{4}-\d{2}-\d{2}\.xlsx/);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(Buffer.from(await excel.arrayBuffer()));
    const filas = [];
    libro.getWorksheet("Detalle").eachRow((fila) => filas.push(fila.values));
    assert.ok(filas.some((valores) => valores.includes("Cliente E2E")), "el Excel incluye la venta del periodo");
    assert.equal((await descargar("/reportes/produccion/detalle/excel?periodo=semanal", tokens.admin)).status, 200);
    assert.equal((await descargar("/reportes/ventas/detalle/excel?periodo=semanal", tokens.vendedor)).status, 403);
    assert.equal((await descargar("/reportes/ventas/detalle/excel?periodo=quincenal", tokens.admin)).status, 400);
  });

  await t.test("CP-029: acceso directo a endpoints con el token de cada rol", async () => {
    const matriz = [
      ["GET", "/usuarios", ["admin"]],
      ["GET", "/materia-prima", ["admin", "supervisor", "almacenista"]],
      ["GET", "/materia-prima/movimientos", ["admin", "supervisor", "almacenista"]],
      ["POST", "/materia-prima", ["admin"]],
      ["GET", "/produccion", ["admin", "supervisor", "operario"]],
      ["GET", "/produccion/operarios", ["admin", "supervisor"]],
      ["GET", "/produccion/supervisores", ["admin"]],
      ["GET", "/produccion/plantillas", ["admin", "supervisor"]],
      ["GET", "/inventario", ["admin", "supervisor", "almacenista", "vendedor"]],
      ["GET", "/inventario/movimientos", ["admin", "supervisor", "almacenista"]],
      ["GET", "/ventas", ["admin", "supervisor", "vendedor"]],
      ["GET", "/reportes/produccion", ["admin", "supervisor"]],
      ["GET", "/reportes/auditoria", ["admin"]],
    ];
    for (const [metodo, ruta, permitidos] of matriz) {
      assert.equal((await llamar(metodo, ruta, null, metodo === "POST" ? {} : undefined)).status, 401, `${ruta} sin token`);
      for (const rol of ROLES) {
        const r = await llamar(metodo, ruta, tokens[rol], metodo === "POST" ? {} : undefined);
        const denegado = r.status === 403 && /No tienes permisos/.test(r.body?.mensaje || "");
        assert.equal(denegado, !permitidos.includes(rol), `${metodo} ${ruta} con rol ${rol} respondió ${r.status}`);
      }
    }
  });

  await t.test("CP-031: ventas concurrentes no dejan stock negativo", async () => {
    const ingreso = await llamar("POST", "/inventario", tokens.almacenista, {
      familia: "Adhesivo PP", medida: "10x15", calibre: "2", color: "Transparente", cantidad: 1500,
    });
    assert.ok([200, 201].includes(ingreso.status), JSON.stringify(ingreso.body));
    const [[variante]] = await db.query("SELECT id FROM inventario WHERE familia = 'Adhesivo PP' AND medida = '10x15'");
    const ventas = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        llamar("POST", "/ventas", tokens.vendedor, {
          cliente: `Concurrente ${i}`, inventario_id: variante.id, cantidad_paquetes: 1, unidades_paquete: 500, precio_paquete: 10000,
        }),
      ),
    );
    assert.equal(ventas.filter((v) => v.status === 201).length, 3);
    assert.equal(ventas.filter((v) => v.status !== 201).length, 2);
    const [[final]] = await db.query("SELECT cantidad FROM inventario WHERE id = ?", [variante.id]);
    assert.equal(Number(final.cantidad), 0);
    const [[movs]] = await db.query("SELECT COUNT(*) AS n FROM movimientos_inventario WHERE inventario_id = ? AND tipo = 'venta'", [variante.id]);
    assert.equal(Number(movs.n), 3);
  });

  await t.test("HU-019: bloqueo tras 5 intentos y desbloqueo por el administrador", async () => {
    for (let intento = 1; intento <= 4; intento += 1) {
      assert.equal((await login("e2e_almacenista", "clave-erronea")).status, 401);
    }
    assert.equal((await login("e2e_almacenista", "clave-erronea")).status, 423);
    assert.equal((await login("e2e_almacenista")).status, 423, "bloqueada aun con la clave correcta");

    const usuarios = await llamar("GET", "/usuarios", tokens.admin);
    assert.equal(Number(usuarios.body.find((u) => u.id === ids.almacenista).bloqueado), 1);
    assert.equal((await llamar("PUT", `/usuarios/${ids.almacenista}/desbloquear`, tokens.admin)).status, 200);
    assert.equal((await login("e2e_almacenista")).status, 200);

    const [acciones] = await db.query("SELECT accion FROM auditoria WHERE accion IN ('BLOQUEO_CUENTA', 'DESBLOQUEAR_USUARIO')");
    assert.deepEqual(acciones.map((a) => a.accion).sort(), ["BLOQUEO_CUENTA", "DESBLOQUEAR_USUARIO"]);
  });

  await t.test("ADR-004: el token deja de servir al desactivar al usuario o cambiarle el rol", async () => {
    const vendedor = `/usuarios/${ids.vendedor}`;
    assert.equal((await llamar("GET", "/ventas", tokens.vendedor)).status, 200);

    assert.equal((await llamar("PUT", vendedor, tokens.admin, { activo: 0 })).status, 200);
    const inactivo = await llamar("GET", "/ventas", tokens.vendedor);
    assert.equal(inactivo.status, 401);
    assert.match(inactivo.body.mensaje, /ya no es válida/);
    assert.equal((await llamar("PUT", vendedor, tokens.admin, { activo: 1 })).status, 200);
    assert.equal((await llamar("GET", "/ventas", tokens.vendedor)).status, 200, "vuelve a servir al reactivarlo");

    assert.equal((await llamar("PUT", vendedor, tokens.admin, { rol: "almacenista" })).status, 200);
    assert.equal((await llamar("GET", "/ventas", tokens.vendedor)).status, 401, "el token conserva el rol anterior");
    assert.equal((await llamar("PUT", vendedor, tokens.admin, { rol: "vendedor" })).status, 200);
  });

  await t.test("DEF-013 / RF-015 / RF-016: compras, ajustes y consumo por orden de materia prima", async () => {
    const creada = await llamar("POST", "/materia-prima", tokens.admin, {
      tipo: "PEBD", medida: "10 x 15", calibre: "2", color: "Transparente", peso_rollo: 100,
    });
    assert.equal(creada.status, 201, JSON.stringify(creada.body));
    const materiaId = creada.body.id;
    const saldo = async () => Number((await db.query("SELECT cantidad FROM materia_prima WHERE id = ?", [materiaId]))[0][0].cantidad);
    const mover = (token, cuerpo) => llamar("POST", "/materia-prima/movimientos", token, { materia_prima_id: materiaId, ...cuerpo });

    assert.equal((await mover(tokens.almacenista, { tipo: "compra", cantidad: 50, observaciones: "Remisión E2E" })).status, 201);
    assert.equal(await saldo(), 150);
    const exceso = await mover(tokens.almacenista, { tipo: "ajuste_salida", cantidad: 999 });
    assert.equal(exceso.status, 400);
    assert.match(exceso.body.mensaje, /Stock insuficiente/);
    assert.equal(await saldo(), 150, "el ajuste rechazado no cambia el saldo");

    // Consumo: solo en una orden activa que usa esa bobina, y solo admin o supervisor
    const orden = await llamar("POST", "/produccion", tokens.admin, {
      producto: "Sencilla PP", cantidad: 200, prioridad: "media", supervisor_id: ids.supervisor, materia_prima_id: materiaId,
    });
    assert.equal(orden.status, 201, JSON.stringify(orden.body));
    const otra = await llamar("POST", "/produccion", tokens.admin, {
      producto: "Cargadera", cantidad: 100, prioridad: "baja", supervisor_id: ids.supervisor,
    });
    assert.equal((await mover(tokens.almacenista, { tipo: "consumo_produccion", cantidad: 5, produccion_id: orden.body.id })).status, 403);
    assert.equal((await mover(tokens.supervisor, { tipo: "compra", cantidad: 5 })).status, 403);
    const sinAsociar = await mover(tokens.supervisor, { tipo: "consumo_produccion", cantidad: 5, produccion_id: otra.body.id });
    assert.equal(sinAsociar.status, 400);
    assert.match(sinAsociar.body.mensaje, /no está asociada/);
    assert.equal((await mover(tokens.supervisor, { tipo: "consumo_produccion", cantidad: 30, produccion_id: orden.body.id })).status, 201);
    assert.equal(await saldo(), 120);
    const [[consumo]] = await db.query(
      "SELECT COUNT(*) AS n FROM movimientos_materia_prima WHERE materia_prima_id = ? AND tipo = 'consumo_produccion' AND produccion_id = ?",
      [materiaId, orden.body.id],
    );
    assert.equal(Number(consumo.n), 1);
  });

  await t.test("la migración de bloqueo se aplica sobre una base anterior y es idempotente", async () => {
    await db.query("ALTER TABLE usuarios DROP COLUMN bloqueado_hasta, DROP COLUMN intentos_fallidos");
    const migracion = fs.readFileSync(path.join(sqlDir, "migrations", "20261027_login_lockout.sql"), "utf8");
    await db.query(migracion);
    await db.query(migracion);
    const [columnas] = await db.query(
      "SELECT column_name AS nombre FROM information_schema.columns WHERE table_schema = ? AND table_name = 'usuarios' AND column_name IN ('intentos_fallidos', 'bloqueado_hasta')",
      [DB],
    );
    assert.equal(columnas.length, 2);
    assert.equal((await login("e2e_admin")).status, 200);
  });
});
