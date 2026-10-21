const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");

async function listar(usuario) {
  const condiciones =
    usuario?.rol === "operario" ? "WHERE p.responsable_id = ?" : "";
  const valores = usuario?.rol === "operario" ? [usuario.id] : [];
  const [filas] = await pool.query(
    `SELECT p.*, mp.nombre AS materia_prima_nombre, u.nombre AS responsable_nombre
     FROM produccion p
     LEFT JOIN materia_prima mp ON mp.id = p.materia_prima_id
     LEFT JOIN usuarios u ON u.id = p.responsable_id
     ${condiciones} ORDER BY p.fecha_inicio DESC`,
    valores,
  );
  return filas;
}

async function listarOperarios() {
  const [filas] = await pool.query(
    "SELECT id, nombre, usuario FROM usuarios WHERE rol = 'operario' AND activo = 1 ORDER BY nombre",
  );
  return filas;
}

async function obtenerPorId(id) {
  const [filas] = await pool.query("SELECT * FROM produccion WHERE id = ?", [
    id,
  ]);
  return filas[0] || null;
}

async function crear(datos, actorId) {
  const { producto, cantidad, materia_prima_id, responsable_id, prioridad } =
    datos;
  const [resultado] = await pool.query(
    "INSERT INTO produccion (producto, cantidad, materia_prima_id, responsable_id, prioridad) VALUES (?, ?, ?, ?, ?)",
    [
      producto,
      cantidad,
      materia_prima_id || null,
      responsable_id || actorId,
      prioridad || "media",
    ],
  );

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "CREAR_ORDEN_PRODUCCION",
    tabla: "produccion",
    detalle: `Orden de produccion creada para '${producto}' (${cantidad})`,
  });

  return obtenerPorId(resultado.insertId);
}

async function actualizarOrden(id, datos, actorId) {
  const camposPermitidos = new Set([
    "producto",
    "cantidad",
    "responsable_id",
    "materia_prima_id",
    "prioridad",
  ]);
  const campos = Object.keys(datos);
  if (!campos.length) throw new Error("Debes indicar al menos un campo");
  if (campos.some((campo) => !camposPermitidos.has(campo))) {
    throw new Error("La orden contiene campos no editables");
  }

  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [filas] = await connection.query(
      "SELECT id, estado, cantidad_producida FROM produccion WHERE id = ? FOR UPDATE",
      [id],
    );
    const orden = filas[0];
    if (!orden) throw new Error("Orden de produccion no encontrada");
    if (orden.estado !== "pendiente" || Number(orden.cantidad_producida) > 0) {
      throw new Error(
        "Solo se pueden editar órdenes pendientes sin avance registrado",
      );
    }

    const { producto, cantidad, responsable_id, materia_prima_id, prioridad } = datos;
    if (producto !== undefined && (typeof producto !== "string" || !producto.trim())) {
      throw new Error("El producto no puede estar vacío");
    }
    if (
      cantidad !== undefined &&
      (!Number.isFinite(Number(cantidad)) || Number(cantidad) <= 0)
    ) {
      throw new Error("La meta debe ser mayor que cero");
    }
    if (prioridad !== undefined && !["baja", "media", "alta"].includes(prioridad)) {
      throw new Error("La prioridad no es válida");
    }
    if (responsable_id !== undefined && responsable_id !== null && Number(responsable_id) !== 0) {
      const [usuarios] = await connection.query(
        "SELECT id FROM usuarios WHERE id = ? AND activo = 1 AND rol = 'operario'",
        [responsable_id],
      );
      if (!usuarios.length)
        throw new Error("El responsable debe ser un operario activo");
    }
    if (materia_prima_id !== undefined && materia_prima_id !== null && Number(materia_prima_id) !== 0) {
      const [materiales] = await connection.query(
        "SELECT id FROM materia_prima WHERE id = ?",
        [materia_prima_id],
      );
      if (!materiales.length) throw new Error("Materia prima no encontrada");
    }

    const actualizaciones = [];
    const valores = [];
    if (producto !== undefined) {
      actualizaciones.push("producto = ?");
      valores.push(producto.trim());
    }
    if (cantidad !== undefined) {
      actualizaciones.push("cantidad = ?");
      valores.push(Number(cantidad));
    }
    if (responsable_id !== undefined) {
      actualizaciones.push("responsable_id = ?");
      valores.push(Number(responsable_id) || null);
    }
    if (materia_prima_id !== undefined) {
      actualizaciones.push("materia_prima_id = ?");
      valores.push(Number(materia_prima_id) || null);
    }
    if (prioridad !== undefined) {
      actualizaciones.push("prioridad = ?");
      valores.push(prioridad);
    }
    valores.push(id);
    await connection.query(
      `UPDATE produccion SET ${actualizaciones.join(", ")} WHERE id = ?`,
      valores,
    );
    await connection.commit();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "ACTUALIZAR_ORDEN_PRODUCCION",
    tabla: "produccion",
    detalle: `Orden de produccion ${id} actualizada antes de iniciar`,
  });
  return obtenerPorId(id);
}

async function cambiarEstado(id, estado, actor) {
  const transiciones = {
    pendiente: ["en_proceso", "cancelado"],
    en_proceso: ["finalizado", "cancelado"],
  };
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [filas] = await connection.query(
      "SELECT id, estado, cantidad, cantidad_producida, responsable_id FROM produccion WHERE id = ? FOR UPDATE",
      [id],
    );
    const orden = filas[0];
    if (!orden) throw new Error("Orden de produccion no encontrada");
    if (
      actor.rol === "operario" &&
      Number(orden.responsable_id) !== Number(actor.id)
    ) {
      throw new Error("No puedes modificar una orden asignada a otro operario");
    }
    if (actor.rol === "operario" && estado !== "en_proceso") {
      throw new Error("El operario solo puede iniciar una orden asignada");
    }
    if (!(transiciones[orden.estado] || []).includes(estado)) {
      throw new Error("La transición de estado solicitada no es válida");
    }
    if (
      estado === "finalizado" &&
      Number(orden.cantidad_producida) < Number(orden.cantidad)
    ) {
      throw new Error("No se puede finalizar una orden con meta pendiente");
    }
    await connection.query(
      "UPDATE produccion SET estado = ?, fecha_fin = CASE WHEN ? = 'cancelado' THEN NOW() ELSE fecha_fin END WHERE id = ?",
      [estado, estado, id],
    );
    await connection.commit();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await registrarAuditoria({
    usuarioId: actor.id,
    accion: "CAMBIAR_ESTADO_PRODUCCION",
    tabla: "produccion",
    detalle: `Orden ${id} cambio a estado '${estado}'`,
  });

  return obtenerPorId(id);
}

async function registrarAvance(id, { cantidad, lote, observaciones }, actor) {
  const cantidadNumerica = Number(cantidad);
  if (!Number.isFinite(cantidadNumerica) || cantidadNumerica <= 0) {
    throw new Error("La cantidad debe ser mayor que cero");
  }
  const connection = await pool.getConnection();
  let transactionStarted = false;
  let producto;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [ordenes] = await connection.query(
      "SELECT * FROM produccion WHERE id = ? FOR UPDATE",
      [id],
    );
    const orden = ordenes[0];
    if (!orden) throw new Error("Orden de produccion no encontrada");
    if (Number(orden.responsable_id) !== Number(actor.id)) {
      throw new Error("Solo puedes registrar avance en tus tareas asignadas");
    }
    if (["cancelado", "finalizado"].includes(orden.estado)) {
      throw new Error("La orden ya no admite registros");
    }
    const disponible =
      Number(orden.cantidad) - Number(orden.cantidad_producida || 0);
    if (cantidadNumerica > disponible)
      throw new Error(`El avance supera la meta pendiente (${disponible})`);

    const nuevoTotal = Number(orden.cantidad_producida || 0) + cantidadNumerica;
    const estado =
      nuevoTotal >= Number(orden.cantidad) ? "finalizado" : "en_proceso";
    producto = orden.producto;
    await connection.query(
      "UPDATE produccion SET cantidad_producida = ?, estado = ?, lote = COALESCE(?, lote), observaciones = COALESCE(?, observaciones), fecha_fin = CASE WHEN ? = 'finalizado' THEN NOW() ELSE fecha_fin END WHERE id = ?",
      [nuevoTotal, estado, lote || null, observaciones || null, estado, id],
    );
    const [inventario] = await connection.query(
      "SELECT id FROM inventario WHERE producto = ? FOR UPDATE",
      [producto],
    );
    let inventarioId;
    if (inventario.length) {
      inventarioId = inventario[0].id;
      await connection.query(
        "UPDATE inventario SET cantidad = cantidad + ? WHERE id = ?",
        [cantidadNumerica, inventarioId],
      );
    } else {
      const [creado] = await connection.query(
        "INSERT INTO inventario (producto, cantidad, ubicacion) VALUES (?, ?, ?)",
        [producto, cantidadNumerica, "Produccion"],
      );
      inventarioId = creado.insertId;
    }
    await connection.query(
      "INSERT INTO movimientos_inventario (inventario_id, usuario_id, produccion_id, tipo, cantidad) VALUES (?, ?, ?, 'produccion', ?)",
      [inventarioId, actor.id, id, cantidadNumerica],
    );
    await connection.commit();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  await registrarAuditoria({
    usuarioId: actor.id,
    accion: "REGISTRAR_AVANCE_PRODUCCION",
    tabla: "produccion",
    detalle: `Orden ${id}: ${cantidadNumerica} unidades registradas`,
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

module.exports = {
  listar,
  listarOperarios,
  obtenerPorId,
  crear,
  actualizarOrden,
  cambiarEstado,
  registrarAvance,
  eliminar,
};
