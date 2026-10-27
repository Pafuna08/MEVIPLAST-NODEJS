const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-only-secret-for-route-authorization";

const app = require("../src/app");
const { pool } = require("../src/config/database");

test("las lecturas de materias primas y producción respetan los roles", async (t) => {
  const originalQuery = pool.query;
  // Un id por rol, para que el middleware encuentre a cada usuario activo con su rol
  const ids = { admin: 1, supervisor: 2, operario: 3, vendedor: 4, almacenista: 5 };
  pool.query = async (sql, params = []) => {
    if (sql.includes("FROM usuarios WHERE id = ?")) {
      const rol = Object.keys(ids).find((clave) => ids[clave] === params[0]);
      return [[{ activo: 1, rol }], []];
    }
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
    const token = jwt.sign({ id: ids[rol], rol }, process.env.JWT_SECRET);
    return fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function post(path, rol, body) {
    const token = jwt.sign({ id: ids[rol], rol }, process.env.JWT_SECRET);
    return fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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

  const userWithoutEmail = await post("/usuarios", "admin", {
    nombre: "Usuario Prueba",
    usuario: "prueba",
    password: "clave123",
    rol: "operario",
  });
  assert.equal(userWithoutEmail.status, 400);

  const userWithInvalidEmail = await post("/usuarios", "admin", {
    nombre: "Usuario Prueba",
    usuario: "prueba",
    correo: "correo-invalido",
    password: "clave123",
    rol: "operario",
  });
  assert.equal(userWithInvalidEmail.status, 400);
});
