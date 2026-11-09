const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");

const CAMPOS_PUBLICOS =
  "id, nombre, usuario, correo, rol, activo, creado_en, bloqueado_hasta, bloqueado_hasta IS NOT NULL AND bloqueado_hasta > NOW() AS bloqueado";

async function listar() {
  const [filas] = await pool.query(
    `SELECT ${CAMPOS_PUBLICOS} FROM usuarios ORDER BY id DESC`
  );
  return filas;
}

async function obtenerPorId(id) {
  const [filas] = await pool.query(
    `SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = ?`,
    [id]
  );
  return filas[0] || null;
}

async function desbloquear(id, actorId) {
  const [resultado] = await pool.query(
    "UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?",
    [id]
  );
  if (!resultado.affectedRows) return null;

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "DESBLOQUEAR_USUARIO",
    tabla: "usuarios",
    detalle: `Se desbloqueo el usuario con id ${id}`,
  });

  return obtenerPorId(id);
}

async function crear({ nombre, usuario, correo, password, rol }, actorId) {
  const hash = await bcrypt.hash(password, 10);
  const [resultado] = await pool.query(
    "INSERT INTO usuarios (nombre, usuario, correo, password_hash, rol) VALUES (?, ?, ?, ?, ?)",
    [nombre, usuario, correo, hash, rol]
  );

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "CREAR_USUARIO",
    tabla: "usuarios",
    detalle: `Se creo el usuario '${usuario}' con rol ${rol}`,
  });

  return obtenerPorId(resultado.insertId);
}

function errorDeRegla(mensaje) {
  const error = new Error(mensaje);
  error.statusCode = 400;
  return error;
}

// Nadie se quita su propio rol de administrador, se desactiva ni se elimina, y siempre
// queda al menos un administrador activo. Se revisa con bloqueo de filas para que dos
// cambios al mismo tiempo no dejen el sistema sin administrador.
async function protegerAdministradores(conexion, id, actorId, { rol, activo, eliminar = false }) {
  const propio = Number(id) === Number(actorId);
  const quitaRol = rol !== undefined && rol !== null && rol !== "admin";
  const desactiva = activo !== undefined && activo !== null && !Number(activo);
  if (propio && eliminar) throw errorDeRegla("No puedes eliminar tu propia cuenta");
  if (propio && quitaRol) throw errorDeRegla("No puedes quitarte el rol de administrador");
  if (propio && desactiva) throw errorDeRegla("No puedes desactivar tu propia cuenta");
  if (!eliminar && !quitaRol && !desactiva) return;
  const [admins] = await conexion.query(
    "SELECT id FROM usuarios WHERE rol = 'admin' AND activo = 1 FOR UPDATE"
  );
  const esAdminActivo = admins.some((admin) => Number(admin.id) === Number(id));
  if (esAdminActivo && admins.length <= 1) {
    throw errorDeRegla("Debe quedar al menos un administrador activo");
  }
}

// Ejecuta el cambio dentro de una transacción, después de proteger a los administradores
async function enTransaccion(id, actorId, cambio, sql, params) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    await protegerAdministradores(conexion, id, actorId, cambio);
    await conexion.query(sql, params);
    await conexion.commit();
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

async function actualizar(id, { nombre, correo, rol, activo }, actorId) {
  await enTransaccion(
    id,
    actorId,
    { rol, activo },
    "UPDATE usuarios SET nombre = COALESCE(?, nombre), correo = COALESCE(?, correo), rol = COALESCE(?, rol), activo = COALESCE(?, activo) WHERE id = ?",
    [nombre ?? null, correo ?? null, rol ?? null, activo ?? null, id]
  );

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "ACTUALIZAR_USUARIO",
    tabla: "usuarios",
    detalle: `Se actualizo el usuario con id ${id}`,
  });

  return obtenerPorId(id);
}

async function eliminar(id, actorId) {
  await enTransaccion(id, actorId, { eliminar: true }, "DELETE FROM usuarios WHERE id = ?", [id]);

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "ELIMINAR_USUARIO",
    tabla: "usuarios",
    detalle: `Se elimino el usuario con id ${id}`,
  });
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar, desbloquear };
