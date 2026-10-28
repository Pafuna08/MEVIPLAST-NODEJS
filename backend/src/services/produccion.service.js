const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");
const { productosTerminados } = require("../constants/productosTerminados");
const { validarVariante } = require("./inventario.service");
const { limitesPeriodo } = require("./reportes.service");

function validarProducto(producto) {
  if (!productosTerminados.includes(producto)) {
    const error = new Error("Selecciona una línea de producto válida");
    error.statusCode = 400;
    throw error;
  }
}

// Medida, calibre y color de la orden: la variante del inventario que recibirá el avance
function varianteOrden(producto, { medida, calibre, color }) {
  const etiqueta = validarVariante({ familia: producto, medida, calibre, color });
  return { medida: medida.trim(), calibre: calibre.trim(), color: color.trim(), etiqueta };
}

async function listar(usuario) {
  const condiciones = [`p.producto IN (${productosTerminados.map(() => "?").join(", ")})`];
  const valores = [...productosTerminados];
  if (usuario?.rol === "operario") {
    condiciones.push("p.responsable_id = ?");
    valores.push(usuario.id);
  } else if (usuario?.rol === "supervisor") {
    condiciones.push("(p.supervisor_id = ? OR p.supervisor_id IS NULL)");
    valores.push(usuario.id);
  }
  const [filas] = await pool.query(
    `SELECT p.*, mp.nombre AS materia_prima_nombre,
            u.nombre AS responsable_nombre, s.nombre AS supervisor_nombre
     FROM produccion p
     LEFT JOIN materia_prima mp ON mp.id = p.materia_prima_id
     LEFT JOIN usuarios u ON u.id = p.responsable_id
     LEFT JOIN usuarios s ON s.id = p.supervisor_id
     WHERE ${condiciones.join(" AND ")}
     ORDER BY p.estado IN ('finalizado', 'cancelado'),
              CASE WHEN p.estado IN ('finalizado', 'cancelado') THEN 0 ELSE FIELD(p.prioridad, 'alta', 'media', 'baja') END,
              p.fecha_inicio DESC, p.id DESC`,
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

async function listarSupervisores() {
  const [filas] = await pool.query(
    "SELECT id, nombre, usuario FROM usuarios WHERE rol = 'supervisor' AND activo = 1 ORDER BY nombre",
  );
  return filas;
}

async function listarPlantillas() {
  const [filas] = await pool.query(
    `SELECT p.*, m.nombre AS materia_prima_nombre
     FROM plantillas_produccion p
     LEFT JOIN materia_prima m ON m.id = p.materia_prima_id
     WHERE p.producto IN (${productosTerminados.map(() => "?").join(", ")})
     ORDER BY p.producto, p.medida, p.calibre, p.color`,
    productosTerminados,
  );
  return filas;
}

async function crearPlantilla(datos, actorId) {
  const { producto, cantidad, materia_prima_id, prioridad } = datos;
  validarProducto(producto);
  const variante = varianteOrden(producto, datos);
  const [resultado] = await pool.query(
    "INSERT INTO plantillas_produccion (producto, medida, calibre, color, cantidad, materia_prima_id, prioridad, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      producto.trim(),
      variante.medida,
      variante.calibre,
      variante.color,
      Number(cantidad),
      Number(materia_prima_id) || null,
      prioridad || "media",
      actorId,
    ],
  );
  const [filas] = await pool.query(
    "SELECT * FROM plantillas_produccion WHERE id = ?",
    [resultado.insertId],
  );
  return filas[0];
}

async function eliminarPlantilla(id) {
  await pool.query("DELETE FROM plantillas_produccion WHERE id = ?", [id]);
}

async function obtenerPorId(id) {
  const [filas] = await pool.query("SELECT * FROM produccion WHERE id = ?", [
    id,
  ]);
  return filas[0] || null;
}

async function crear(datos, actor) {
  const {
    producto,
    cantidad,
    materia_prima_id,
    responsable_id,
    prioridad,
  } = datos;
  validarProducto(producto);
  const variante = varianteOrden(producto, datos);
  let supervisorId = null;
  let responsableId = Number(responsable_id) || null;
  if (actor.rol === "admin") {
    // CR-014: la orden del administrador queda pendiente para los supervisores, sin supervisor ni operario fijos;
    // la toma el supervisor que le asigne el operario
    supervisorId = null;
    responsableId = null;
  } else {
    supervisorId = actor.id;
    if (!responsableId) throw new Error("Debes asignar un operario");
    const [operarios] = await pool.query(
      "SELECT id FROM usuarios WHERE id = ? AND activo = 1 AND rol = 'operario'",
      [responsableId],
    );
    if (!operarios.length) throw new Error("El responsable debe ser un operario activo");
  }
  const [resultado] = await pool.query(
    "INSERT INTO produccion (producto, medida, calibre, color, cantidad, materia_prima_id, supervisor_id, responsable_id, prioridad) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      producto,
      variante.medida,
      variante.calibre,
      variante.color,
      cantidad,
      materia_prima_id || null,
      supervisorId,
      responsableId,
      prioridad || "media",
    ],
  );

  await registrarAuditoria({
    usuarioId: actor.id,
    accion: "CREAR_ORDEN_PRODUCCION",
    tabla: "produccion",
    detalle: `Orden de producción creada para '${variante.etiqueta}' (${cantidad})`,
  });

  return obtenerPorId(resultado.insertId);
}

async function asignarOperario(id, responsableId, actor) {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [ordenes] = await connection.query(
      "SELECT id, estado, cantidad_producida, supervisor_id FROM produccion WHERE id = ? FOR UPDATE",
      [id],
    );
    const orden = ordenes[0];
    if (!orden) throw new Error("Orden de produccion no encontrada");
    if (
      actor.rol === "supervisor" &&
      orden.supervisor_id &&
      Number(orden.supervisor_id) !== Number(actor.id)
    ) {
      throw new Error("Solo puedes asignar órdenes que te fueron entregadas");
    }
    if (orden.estado !== "pendiente" || Number(orden.cantidad_producida) > 0) {
      throw new Error("Solo puedes asignar órdenes pendientes sin avance");
    }
    const [operarios] = await connection.query(
      "SELECT id FROM usuarios WHERE id = ? AND activo = 1 AND rol = 'operario'",
      [responsableId],
    );
    if (!operarios.length) throw new Error("El responsable debe ser un operario activo");
    // El supervisor que asigna toma la orden; si asigna el administrador (falta el supervisor), no cambia de supervisor
    await connection.query(
      "UPDATE produccion SET supervisor_id = ?, responsable_id = ? WHERE id = ?",
      [actor.rol === "supervisor" ? actor.id : orden.supervisor_id, responsableId, id],
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
    accion: "ASIGNAR_ORDEN_OPERARIO",
    tabla: "produccion",
    detalle: `Orden de producción ${id} asignada al operario ${responsableId}`,
  });
  return obtenerPorId(id);
}

async function actualizarOrden(id, datos, actor) {
  const actorId = actor?.id ?? actor;
  const camposPermitidos = new Set([
    "producto",
    "medida",
    "calibre",
    "color",
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
  const camposVariante = ["medida", "calibre", "color"].filter((campo) => campos.includes(campo));
  if (camposVariante.length && camposVariante.length < 3) {
    throw new Error("Indica medida, calibre y color juntos");
  }

  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [filas] = await connection.query(
      "SELECT id, producto, estado, cantidad_producida, supervisor_id FROM produccion WHERE id = ? FOR UPDATE",
      [id],
    );
    const orden = filas[0];
    if (!orden) throw new Error("Orden de produccion no encontrada");
    if (
      actor?.rol === "supervisor" &&
      orden.supervisor_id &&
      Number(orden.supervisor_id) !== Number(actor.id)
    ) {
      throw new Error("Solo puedes editar órdenes que te fueron entregadas");
    }
    if (orden.estado !== "pendiente" || Number(orden.cantidad_producida) > 0) {
      throw new Error(
        "Solo se pueden editar órdenes pendientes sin avance registrado",
      );
    }

    const { producto, cantidad, responsable_id, materia_prima_id, prioridad } = datos;
    if (producto !== undefined && (typeof producto !== "string" || !producto.trim())) {
      throw new Error("El producto no puede estar vacío");
    }
    if (producto !== undefined) validarProducto(producto.trim());
    const variante = camposVariante.length
      ? varianteOrden(producto !== undefined ? producto.trim() : orden.producto, datos)
      : null;
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
    if (variante) {
      actualizaciones.push("medida = ?", "calibre = ?", "color = ?");
      valores.push(variante.medida, variante.calibre, variante.color);
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
    detalle: `Orden de producción ${id} actualizada antes de iniciar`,
  });
  return obtenerPorId(id);
}

async function cambiarEstado(id, estado, actor) {
  const transiciones = {
    pendiente: ["en_proceso", "cancelado"],
    en_proceso: ["cancelado"],
  };
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [filas] = await connection.query(
      "SELECT id, estado, cantidad, cantidad_producida, responsable_id, supervisor_id FROM produccion WHERE id = ? FOR UPDATE",
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
    if (
      actor.rol === "supervisor" &&
      orden.supervisor_id &&
      Number(orden.supervisor_id) !== Number(actor.id)
    ) {
      throw new Error("No puedes modificar una orden asignada a otro supervisor");
    }
    // CR-013: el operario inicia su orden; el administrador y el supervisor solo cancelan.
    // Nadie finaliza a mano: la orden se finaliza sola al registrar el avance que completa la meta.
    if (actor.rol === "operario" && estado !== "en_proceso") {
      throw new Error("El operario solo puede iniciar una orden asignada");
    }
    if (["admin", "supervisor"].includes(actor.rol) && estado !== "cancelado") {
      throw new Error("Solo el operario inicia la orden y se finaliza sola al completar la meta; aquí solo puedes cancelarla");
    }
    if (!(transiciones[orden.estado] || []).includes(estado)) {
      throw new Error("La transición de estado solicitada no es válida");
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

async function registrarAvance(id, { cantidad, observaciones }, actor) {
  const cantidadNumerica = Number(cantidad);
  const nota = typeof observaciones === "string" && observaciones.trim() ? observaciones.trim() : null;
  if (nota && nota.length > 255) {
    throw new Error("Las observaciones no pueden superar 255 caracteres");
  }
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
      "UPDATE produccion SET cantidad_producida = ?, estado = ?, observaciones = COALESCE(?, observaciones), fecha_fin = CASE WHEN ? = 'finalizado' THEN NOW() ELSE fecha_fin END WHERE id = ?",
      [nuevoTotal, estado, nota, estado, id],
    );
    // Las órdenes con variante suman a esa variante (y la crean si aún no existe);
    // las anteriores a la migración siguen usando el registro genérico de la línea
    const conVariante = Boolean(orden.medida && orden.calibre && orden.color);
    const [inventario] = conVariante
      ? await connection.query(
          "SELECT id FROM inventario WHERE familia = ? AND medida = ? AND calibre = ? AND color = ? FOR UPDATE",
          [producto, orden.medida, orden.calibre, orden.color],
        )
      : await connection.query(
          "SELECT id FROM inventario WHERE familia = ? AND medida IS NULL AND calibre IS NULL AND color IS NULL FOR UPDATE",
          [producto],
        );
    let inventarioId;
    if (inventario.length) {
      inventarioId = inventario[0].id;
      await connection.query(
        "UPDATE inventario SET cantidad = cantidad + ? WHERE id = ?",
        [cantidadNumerica, inventarioId],
      );
    } else if (conVariante) {
      const etiqueta = `${producto} · ${orden.medida} · calibre ${orden.calibre} · ${orden.color}`;
      const [creado] = await connection.query(
        "INSERT INTO inventario (producto, familia, medida, calibre, color, cantidad, ubicacion) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [etiqueta, producto, orden.medida, orden.calibre, orden.color, cantidadNumerica, "Por ubicar"],
      );
      inventarioId = creado.insertId;
    } else {
      const [creado] = await connection.query(
        "INSERT INTO inventario (producto, familia, cantidad, ubicacion) VALUES (?, ?, ?, ?)",
        [producto, producto, cantidadNumerica, "Produccion"],
      );
      inventarioId = creado.insertId;
    }
    await connection.query(
      // La observación queda también en el movimiento, para el historial del operario
      "INSERT INTO movimientos_inventario (inventario_id, usuario_id, produccion_id, tipo, cantidad, observaciones) VALUES (?, ?, ?, 'produccion', ?, ?)",
      [inventarioId, actor.id, id, cantidadNumerica, nota],
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

// Avances que registró el operario en el periodo calendario (diario, semanal, mensual o anual)
async function misRegistros(usuarioId, periodo) {
  const rango = limitesPeriodo(periodo);
  const [detalle] = await pool.query(
    `SELECT mi.id, mi.fecha, mi.cantidad, mi.produccion_id AS orden_id, mi.observaciones, i.producto
     FROM movimientos_inventario mi
     JOIN inventario i ON i.id = mi.inventario_id
     WHERE mi.tipo = 'produccion' AND mi.usuario_id = ? AND mi.fecha >= ? AND mi.fecha < ?
     ORDER BY mi.fecha DESC, mi.id DESC`,
    [usuarioId, rango.desde, rango.hasta],
  );
  const resumen = {
    registros: detalle.length,
    unidades: detalle.reduce((suma, fila) => suma + Number(fila.cantidad), 0),
    ordenes: new Set(detalle.map((fila) => fila.orden_id).filter(Boolean)).size,
  };
  return { periodo, ...rango, resumen, detalle };
}

async function eliminar(id, actorId) {
  await pool.query("DELETE FROM produccion WHERE id = ?", [id]);

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "ELIMINAR_ORDEN_PRODUCCION",
    tabla: "produccion",
    detalle: `Orden de producción ${id} eliminada`,
  });
}

module.exports = {
  listar,
  listarOperarios,
  listarSupervisores,
  listarPlantillas,
  crearPlantilla,
  eliminarPlantilla,
  obtenerPorId,
  crear,
  asignarOperario,
  actualizarOrden,
  cambiarEstado,
  registrarAvance,
  misRegistros,
  eliminar,
};
