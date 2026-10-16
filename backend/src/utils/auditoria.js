const { pool } = require("../config/database");

/**
 * Registra una accion en la bitacora de auditoria.
 * Se usa desde los services de cada modulo cada vez que se crea,
 * edita o elimina un registro sensible.
 */
async function registrarAuditoria({ usuarioId, accion, tabla, detalle }) {
  try {
    await pool.query(
      "INSERT INTO auditoria (usuario_id, accion, tabla_afectada, detalle) VALUES (?, ?, ?, ?)",
      [usuarioId || null, accion, tabla, detalle || null]
    );
  } catch (error) {
    // La auditoria nunca debe tumbar la operacion principal
    console.error("No se pudo registrar auditoria:", error.message);
  }
}

module.exports = { registrarAuditoria };
