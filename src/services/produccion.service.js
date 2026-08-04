const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");

async function listar() {
  const [filas] = await pool.query(
    `SELECT p.*, mp.nombre AS materia_prima_nombre, u.nombre AS responsable_nombre
     FROM produccion p
     LEFT JOIN materia_prima mp ON mp.id = p.materia_prima_id
     LEFT JOIN usuarios u ON u.id = p.responsable_id
     ORDER BY p.fecha_inicio DESC`
  );
  return filas;
}

async function obtenerPorId(id) {
  const [filas] = await pool.query("SELECT * FROM produccion WHERE id = ?", [id]);
  return filas[0] || null;
}

async function crear(datos, actorId) {
  const { producto, cantidad, materia_prima_id, responsable_id } = datos;
  const [resultado] = await pool.query(
    "INSERT INTO produccion (producto, cantidad, materia_prima_id, responsable_id) VALUES (?, ?, ?, ?)",
    [producto, cantidad, materia_prima_id || null, responsable_id || actorId]
  );

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "CREAR_ORDEN_PRODUCCION",
    tabla: "produccion",
    detalle: `Orden de produccion creada para '${producto}' (${cantidad})`,
  });

  return obtenerPorId(resultado.insertId);
}

async function cambiarEstado(id, estado, actorId) {
  const fechaFin = estado === "finalizado" ? new Date() : null;
  await pool.query(
    "UPDATE produccion SET estado = ?, fecha_fin = COALESCE(?, fecha_fin) WHERE id = ?",
    [estado, fechaFin, id]
  );

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "CAMBIAR_ESTADO_PRODUCCION",
    tabla: "produccion",
    detalle: `Orden ${id} cambio a estado '${estado}'`,
  });

  return obtenerPorId(id);
}

async function eliminar(id, actorId) {
  await pool.query("DELETE FROM produccion WHERE id = ?", [id]);

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "ELIMINAR_ORDEN_PRODUCCION",
    tabla: "produccion",
    detalle: `Orden de produccion ${id} eliminada`,
  });
}

module.exports = { listar, obtenerPorId, crear, cambiarEstado, eliminar };
