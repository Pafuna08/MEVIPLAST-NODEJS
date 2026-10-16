const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");

async function listar() {
  const [filas] = await pool.query(
    "SELECT id, nombre, usuario, rol, activo, creado_en FROM usuarios ORDER BY id DESC"
  );
  return filas;
}

async function obtenerPorId(id) {
  const [filas] = await pool.query(
    "SELECT id, nombre, usuario, rol, activo, creado_en FROM usuarios WHERE id = ?",
    [id]
  );
  return filas[0] || null;
}

async function crear({ nombre, usuario, password, rol }, actorId) {
  const hash = await bcrypt.hash(password, 10);
  const [resultado] = await pool.query(
    "INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)",
    [nombre, usuario, hash, rol]
  );

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "CREAR_USUARIO",
    tabla: "usuarios",
    detalle: `Se creo el usuario '${usuario}' con rol ${rol}`,
  });

  return obtenerPorId(resultado.insertId);
}

async function actualizar(id, { nombre, rol, activo }, actorId) {
  await pool.query(
    "UPDATE usuarios SET nombre = COALESCE(?, nombre), rol = COALESCE(?, rol), activo = COALESCE(?, activo) WHERE id = ?",
    [nombre, rol, activo, id]
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

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
