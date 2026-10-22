const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { pool } = require("../src/config/database");
const authService = require("../src/services/auth.service");

test("solicitud de recuperación rechaza un correo inválido", async () => {
  await assert.rejects(
    authService.solicitarRecuperacion("correo-invalido"),
    { status: 400 },
  );
});

test("restablecimiento rechaza tokens inválidos o vencidos", async () => {
  await assert.rejects(
    authService.restablecerPassword("token-invalido", "nueva-clave-123"),
    { status: 400 },
  );
});

test("restablecimiento verifica y consume el token dentro de una transacción", async (t) => {
  const originalGetConnection = pool.getConnection;
  const originalQuery = pool.query;
  const token = crypto.randomBytes(32).toString("hex");
  const expectedHash = crypto.createHash("sha256").update(token).digest("hex");
  let storedPasswordHash;
  let committed = false;
  let usedToken = false;

  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {
      committed = true;
    },
    rollback: async () => assert.fail("No debe revertir un cambio válido"),
    release: () => {},
    query: async (sql, params = []) => {
      if (sql.startsWith("SELECT t.id")) {
        assert.equal(params[0], expectedHash);
        return [[{ id: 4, usuario_id: 9 }]];
      }
      if (sql.startsWith("UPDATE usuarios")) {
        storedPasswordHash = params[0];
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith("SELECT ROW_COUNT")) {
        return [[{ actualizados: 1 }]];
      }
      if (sql.startsWith("UPDATE tokens_recuperacion")) {
        usedToken = true;
      }
      return [[], []];
    },
  });
  pool.query = async () => [[], []];
  t.after(() => {
    pool.getConnection = originalGetConnection;
    pool.query = originalQuery;
  });

  await authService.restablecerPassword(token, "nueva-clave-123");
  assert.equal(committed, true);
  assert.equal(usedToken, true);
  assert.equal(await bcrypt.compare("nueva-clave-123", storedPasswordHash), true);
});
