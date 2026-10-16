const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");

async function listar() {
  const [filas] = await pool.query("SELECT * FROM materia_prima ORDER BY fecha_ingreso DESC");
  return filas;
}

async function obtenerPorId(id) {
  const [filas] = await pool.query("SELECT * FROM materia_prima WHERE id = ?", [id]);
  return filas[0] || null;
}

async function crear(datos, actorId) {
  const { nombre, tipo, cantidad, unidad, proveedor, stock_minimo } = datos;
  const [resultado] = await pool.query(
    "INSERT INTO materia_prima (nombre, tipo, cantidad, unidad, proveedor, stock_minimo) VALUES (?, ?, ?, ?, ?, ?)",
    [nombre, tipo, cantidad, unidad || "kg", proveedor || null, stock_minimo || 0]
  );

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "CREAR_MATERIA_PRIMA",
    tabla: "materia_prima",
    detalle: `Ingreso de materia prima '${nombre}' (${cantidad} ${unidad || "kg"})`,
  });

  return obtenerPorId(resultado.insertId);
}

async function actualizar(id, datos, actorId) {
  const { nombre, tipo, cantidad, unidad, proveedor, stock_minimo } = datos;
  await pool.query(
    `UPDATE materia_prima SET
      nombre = COALESCE(?, nombre),
      tipo = COALESCE(?, tipo),
      cantidad = COALESCE(?, cantidad),
      unidad = COALESCE(?, unidad),
      proveedor = COALESCE(?, proveedor),
      stock_minimo = COALESCE(?, stock_minimo)
     WHERE id = ?`,
    [nombre, tipo, cantidad, unidad, proveedor, stock_minimo, id]
  );

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "ACTUALIZAR_MATERIA_PRIMA",
    tabla: "materia_prima",
    detalle: `Actualizacion de materia prima con id ${id}`,
  });

  return obtenerPorId(id);
}

async function eliminar(id, actorId) {
  await pool.query("DELETE FROM materia_prima WHERE id = ?", [id]);

  await registrarAuditoria({
    usuarioId: actorId,
    accion: "ELIMINAR_MATERIA_PRIMA",
    tabla: "materia_prima",
    detalle: `Eliminacion de materia prima con id ${id}`,
  });
}

async function listarBajoStock() {
  const [filas] = await pool.query("SELECT * FROM materia_prima WHERE cantidad <= stock_minimo");
  return filas;
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar, listarBajoStock };
