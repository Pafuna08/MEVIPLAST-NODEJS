// DEF-023: respuestas de la API con el código correcto (400, 404) en lugar de 200 o 500
const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");

process.env.JWT_SECRET = "test-only-secret-for-api-responses";

const app = require("../src/app");
const { pool } = require("../src/config/database");
const produccionService = require("../src/services/produccion.service");
const usuariosService = require("../src/services/usuarios.service");
const materiaPrimaService = require("../src/services/materiaPrima.service");
const reportesService = require("../src/services/reportes.service");

function conexionSimulada(t, responder) {
  const originalGetConnection = pool.getConnection;
  const estado = { sentencias: [], confirmado: false, revertido: false };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => { estado.confirmado = true; },
    rollback: async () => { estado.revertido = true; },
    release: () => {},
    query: async (sql, params = []) => {
      estado.sentencias.push(sql);
      return responder(sql, params);
    },
  });
  t.after(() => { pool.getConnection = originalGetConnection; });
  return estado;
}

test("un cuerpo JSON mal formado responde 400, no 500", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, "listening");
  const respuesta = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{malo",
  });
  assert.equal(respuesta.status, 400);
  assert.match((await respuesta.json()).mensaje, /no es un JSON válido/);
});

test("solo se elimina una orden pendiente y sin avance; si no existe, 404", async (t) => {
  let orden = null;
  const estado = conexionSimulada(t, (sql) => {
    if (sql.startsWith("SELECT id, estado, cantidad_producida FROM produccion")) return [orden ? [orden] : []];
    return [{ affectedRows: 1 }];
  });
  await assert.rejects(produccionService.eliminar(99, 1), { statusCode: 404 });
  orden = { id: 5, estado: "en_proceso", cantidad_producida: 40 };
  await assert.rejects(produccionService.eliminar(5, 1), { statusCode: 400, message: /Solo se pueden eliminar órdenes pendientes sin avance/ });
  orden = { id: 5, estado: "cancelado", cantidad_producida: 0 };
  await assert.rejects(produccionService.eliminar(5, 1), { statusCode: 400 });
  assert.ok(!estado.sentencias.some((sql) => sql.startsWith("DELETE")), "no borró nada");
  orden = { id: 6, estado: "pendiente", cantidad_producida: 0 };
  const originalQuery = pool.query;
  pool.query = async () => [{ insertId: 1 }];
  t.after(() => { pool.query = originalQuery; });
  await produccionService.eliminar(6, 1);
  assert.ok(estado.sentencias.some((sql) => sql.startsWith("DELETE FROM produccion")));
  assert.ok(estado.confirmado);
});

test("editar o eliminar un usuario que no existe responde 404", async (t) => {
  conexionSimulada(t, (sql) => {
    if (sql.includes("WHERE rol = 'admin' AND activo = 1")) return [[{ id: 1 }, { id: 2 }]];
    return [{ affectedRows: 0 }];
  });
  await assert.rejects(usuariosService.actualizar(999, { nombre: "Nadie" }, 1), { statusCode: 404, message: "Usuario no encontrado" });
  await assert.rejects(usuariosService.eliminar(999, 1), { statusCode: 404, message: "Usuario no encontrado" });
});

test("editar la cantidad o poner un material inválido en una bobina responde 400", async () => {
  await assert.rejects(materiaPrimaService.actualizar(3, { cantidad: 99999 }, 1), { statusCode: 400, message: /compra, consumo o ajuste/ });
  await assert.rejects(materiaPrimaService.actualizar(3, { tipo: "PVC" }, 1), { statusCode: 400, message: "Selecciona un material válido" });
});

test("la auditoría rechaza una fecha que no existe en el calendario", async () => {
  await assert.rejects(reportesService.bitacoraAuditoria({ desde: "2026-13-45" }), { statusCode: 400, message: /no es una fecha válida/ });
  await assert.rejects(reportesService.bitacoraAuditoria({ hasta: "2026-02-30" }), { statusCode: 400, message: /no es una fecha válida/ });
});
