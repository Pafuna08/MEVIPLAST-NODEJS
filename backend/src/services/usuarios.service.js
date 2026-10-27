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

async function actualizar(id, { nombre, correo, rol, activo }, actorId) {
  await pool.query(
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
  await pool.query("DELETE FROM usuarios WHERE id = ?", [id]);

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "ELIMINAR_USUARIO",
    tabla: "usuarios",
    detalle: `Se elimino el usuario con id ${id}`,
  });
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar, desbloquear };
