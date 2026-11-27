const test = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../src/config/database");
const usuariosService = require("../src/services/usuarios.service");

// Simula la base: admins activos según la lista y registra lo que se ejecuta
function simularBase(t, adminsActivos) {
  const originalGetConnection = pool.getConnection;
  const originalQuery = pool.query;
  const estado = { cambios: [], revertido: false, confirmado: false };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => { estado.confirmado = true; },
    rollback: async () => { estado.revertido = true; },
    release: () => {},
    query: async (sql, params = []) => {
      if (sql.includes("WHERE rol = 'admin' AND activo = 1")) return [adminsActivos.map((id) => ({ id }))];
      if (sql.startsWith("UPDATE usuarios") || sql.startsWith("DELETE FROM usuarios")) {
        estado.cambios.push({ sql, params });
        return [{ affectedRows: 1 }];
      }
      return [[]];
    },
  });
  pool.query = async () => [[{ id: 2, usuario: "otro", rol: "admin", activo: 1 }]];
  t.after(() => {
    pool.getConnection = originalGetConnection;
    pool.query = originalQuery;
  });
  return estado;
}

test("un administrador no puede quitarse su propio rol ni desactivarse", async (t) => {
  const estado = simularBase(t, [1, 2]);
  await assert.rejects(usuariosService.actualizar(1, { rol: "operario" }, 1), /No puedes quitarte el rol de administrador/);
  await assert.rejects(usuariosService.actualizar(1, { activo: 0 }, 1), /No puedes desactivar tu propia cuenta/);
  assert.equal(estado.cambios.length, 0);
});

test("un administrador no puede eliminar su propia cuenta", async (t) => {
  const estado = simularBase(t, [1, 2]);
  await assert.rejects(usuariosService.eliminar(1, 1), /No puedes eliminar tu propia cuenta/);
  assert.equal(estado.cambios.length, 0);
});

test("siempre queda al menos un administrador activo", async (t) => {
  const estado = simularBase(t, [2]);
  // El actor (id 1) ya no es admin activo en la base; el único admin activo es el 2
  await assert.rejects(usuariosService.actualizar(2, { rol: "supervisor" }, 1), /al menos un administrador activo/);
  await assert.rejects(usuariosService.actualizar(2, { activo: 0 }, 1), /al menos un administrador activo/);
  await assert.rejects(usuariosService.eliminar(2, 1), /al menos un administrador activo/);
  assert.equal(estado.cambios.length, 0);
});

test("con otro administrador activo se puede cambiar el rol, desactivar o eliminar a un admin", async (t) => {
  const estado = simularBase(t, [1, 2]);
  await usuariosService.actualizar(2, { activo: 0 }, 1);
  await usuariosService.eliminar(2, 1);
  assert.equal(estado.cambios.length, 2);
  assert.ok(estado.confirmado);
});

test("el administrador sí puede cambiar su propio nombre o correo", async (t) => {
  const estado = simularBase(t, [1]);
  await usuariosService.actualizar(1, { nombre: "Administración", rol: "admin", activo: 1 }, 1);
  assert.equal(estado.cambios.length, 1);
});
