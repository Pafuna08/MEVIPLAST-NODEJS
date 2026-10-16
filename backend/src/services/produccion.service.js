const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");

async function listar(usuario) {
  const condiciones = usuario?.rol === "operario" ? "WHERE p.responsable_id = ?" : "";
  const valores = usuario?.rol === "operario" ? [usuario.id] : [];
  const [filas] = await pool.query(
    `SELECT p.*, mp.nombre AS materia_prima_nombre, u.nombre AS responsable_nombre
     FROM produccion p
     LEFT JOIN materia_prima mp ON mp.id = p.materia_prima_id
     LEFT JOIN usuarios u ON u.id = p.responsable_id
     ${condiciones} ORDER BY p.fecha_inicio DESC`, valores
  );
  return filas;
}

async function listarOperarios() {
  const [filas] = await pool.query("SELECT id, nombre, usuario FROM usuarios WHERE rol = 'operario' AND activo = 1 ORDER BY nombre");
  return filas;
}

async function obtenerPorId(id) {
  const [filas] = await pool.query("SELECT * FROM produccion WHERE id = ?", [id]);
  return filas[0] || null;
}

async function crear(datos, actorId) {
  const { producto, cantidad, materia_prima_id, responsable_id, prioridad } = datos;
  const [resultado] = await pool.query(
    "INSERT INTO produccion (producto, cantidad, materia_prima_id, responsable_id, prioridad) VALUES (?, ?, ?, ?, ?)",
    [producto, cantidad, materia_prima_id || null, responsable_id || actorId, prioridad || "media"]
  );

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "CREAR_ORDEN_PRODUCCION",
    tabla: "produccion",
    detalle: `Orden de produccion creada para '${producto}' (${cantidad})`,
  });

  return obtenerPorId(resultado.insertId);
}

async function cambiarEstado(id, estado, actor) {
  const orden = await obtenerPorId(id);
  if (!orden) throw new Error("Orden de produccion no encontrada");
  if (actor.rol === "operario" && orden.responsable_id !== actor.id) throw new Error("No puedes modificar una orden asignada a otro operario");
  const fechaFin = estado === "finalizado" ? new Date() : null;
  await pool.query(
    "UPDATE produccion SET estado = ?, fecha_fin = COALESCE(?, fecha_fin) WHERE id = ?",
    [estado, fechaFin, id]
  );

  await registrarAuditoria({
    usuarioId: actor.id,
    accion: "CAMBIAR_ESTADO_PRODUCCION",
    tabla: "produccion",
    detalle: `Orden ${id} cambio a estado '${estado}'`,
  });

  return obtenerPorId(id);
}

async function registrarAvance(id, { cantidad, lote, observaciones }, actor) {
  const orden = await obtenerPorId(id);
  if (!orden) throw new Error("Orden de produccion no encontrada");
  if (orden.responsable_id !== actor.id) throw new Error("Solo puedes registrar avance en tus tareas asignadas");
  if (orden.estado === "cancelado" || orden.estado === "finalizado") throw new Error("La orden ya no admite registros");
  const disponible = Number(orden.cantidad) - Number(orden.cantidad_producida || 0);
  if (cantidad > disponible) throw new Error(`El avance supera la meta pendiente (${disponible})`);

  const nuevoTotal = Number(orden.cantidad_producida || 0) + cantidad;
  const estado = nuevoTotal >= Number(orden.cantidad) ? "finalizado" : "en_proceso";
  await pool.query(
    "UPDATE produccion SET cantidad_producida = ?, estado = ?, lote = COALESCE(?, lote), observaciones = COALESCE(?, observaciones), fecha_fin = CASE WHEN ? = 'finalizado' THEN NOW() ELSE fecha_fin END WHERE id = ?",
    [nuevoTotal, estado, lote || null, observaciones || null, estado, id]
  );
  const [inventario] = await pool.query("SELECT id FROM inventario WHERE producto = ?", [orden.producto]);
  if (inventario.length) {
    await pool.query("UPDATE inventario SET cantidad = cantidad + ? WHERE id = ?", [cantidad, inventario[0].id]);
  } else {
    await pool.query("INSERT INTO inventario (producto, cantidad, ubicacion) VALUES (?, ?, ?)", [orden.producto, cantidad, "Produccion"]);
  }
  await registrarAuditoria({ usuarioId: actor.id, accion: "REGISTRAR_AVANCE_PRODUCCION", tabla: "produccion", detalle: `Orden ${id}: ${cantidad} unidades registradas` });
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

module.exports = { listar, listarOperarios, obtenerPorId, crear, cambiarEstado, registrarAvance, eliminar };
