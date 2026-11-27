const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-only-secret-for-inventory-permissions";

const app = require("../src/app");
const { pool } = require("../src/config/database");

// CP-120 · DEF-044: el supervisor tenía permiso en la API para los ingresos y salidas manuales de producto terminado
// y para su historial de movimientos, sin tener la vista de Inventario en el panel. Esas operaciones son del
// administrador y del almacenista. El supervisor sigue viendo las existencias (Inicio y reporte de inventario) y
// registrando el consumo de materia prima de sus órdenes desde Seguimiento (CR-026).
test("CP-120: el supervisor solo consulta las existencias de producto terminado", async (t) => {
  const ids = { admin: 1, supervisor: 2, operario: 3, vendedor: 4, almacenista: 5 };
  const original = pool.query;
  pool.query = async (sql, params = []) => {
    if (sql.includes("FROM usuarios WHERE id = ?")) {
      const rol = Object.keys(ids).find((clave) => ids[clave] === params[0]);
      return [[{ activo: 1, rol }], []];
    }
    return [[], []];
  };
  t.after(() => { pool.query = original; });
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const llamar = (metodo, ruta, rol, cuerpo) => fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${jwt.sign({ id: ids[rol], rol }, process.env.JWT_SECRET)}`, "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });

  const soloAdminYAlmacenista = [
    ["GET", "/inventario/movimientos"],
    ["GET", "/inventario/1/movimientos"],
    ["POST", "/inventario", {}],
    ["POST", "/inventario/1/salida", {}],
  ];
  for (const [metodo, ruta, cuerpo] of soloAdminYAlmacenista) {
    for (const rol of ["supervisor", "operario", "vendedor"]) {
      assert.equal((await llamar(metodo, ruta, rol, cuerpo)).status, 403, `${metodo} ${ruta} con ${rol}`);
    }
    // Un cuerpo vacío responde 400 (o 200 en las lecturas) sin llegar a 403: el rol pasó
    for (const rol of ["admin", "almacenista"]) {
      assert.notEqual((await llamar(metodo, ruta, rol, cuerpo)).status, 403, `${metodo} ${ruta} con ${rol}`);
    }
  }

  // Sigue consultando las existencias (Inicio) y registrando el consumo de sus órdenes desde Seguimiento:
  // la cantidad inválida responde 400 sin llegar a la base, lo que prueba que el rol pasó
  assert.equal((await llamar("GET", "/inventario", "supervisor")).status, 200, "el supervisor consulta las existencias");
  const consumo = await llamar("POST", "/materia-prima/movimientos", "supervisor", { materia_prima_id: 1, tipo: "consumo_produccion", cantidad: "abc" });
  assert.equal(consumo.status, 400, "el supervisor sigue registrando el consumo");
});
