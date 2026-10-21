const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-only-secret-for-route-authorization";

const app = require("../src/app");
const { pool } = require("../src/config/database");

test("las lecturas de materias primas y producción respetan los roles", async (t) => {
  const originalQuery = pool.query;
  pool.query = async (sql) => {
    if (sql.includes("FROM materia_prima WHERE id = ?")) {
      return [[{ id: 1, nombre: "Resina" }], []];
    }
    return [[], []];
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const server = app.listen(0, "127.0.0.1");
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  async function get(path, rol) {
    const token = jwt.sign({ id: 7, rol }, process.env.JWT_SECRET);
    return fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  for (const rol of ["vendedor", "operario"]) {
    const response = await get("/materia-prima/1", rol);
    assert.equal(response.status, 403, `${rol} no debe leer materias primas`);
  }

  for (const rol of ["admin", "supervisor", "almacenista"]) {
    const response = await get("/materia-prima/1", rol);
    assert.equal(response.status, 200, `${rol} debe leer materias primas`);
  }

  for (const rol of ["vendedor", "almacenista"]) {
    const response = await get("/produccion", rol);
    assert.equal(response.status, 403, `${rol} no debe listar producción`);
  }

  for (const rol of ["admin", "supervisor", "operario"]) {
    const response = await get("/produccion", rol);
    assert.equal(response.status, 200, `${rol} debe listar producción`);
  }
});
