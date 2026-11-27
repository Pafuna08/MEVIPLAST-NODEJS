// CR-016 (retención de la auditoría, OBS-005): los registros con más de AUDIT_RETENTION_MONTHS meses
// (12 por defecto) pasan a un archivo plano CSV por año (auditoria-AAAA.csv en AUDIT_ARCHIVE_DIR) y
// luego se borran de la tabla. El archivo se escribe y se guarda en disco ANTES de borrar, dentro de
// una transacción: si algo falla al escribir, no se borra nada.
const fs = require("fs");
const path = require("path");
const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");

const COLUMNAS = ["id", "fecha", "usuario_id", "usuario", "accion", "tabla", "detalle"];

function mesesRetencion(valor = process.env.AUDIT_RETENTION_MONTHS) {
  const meses = Math.trunc(Number(valor));
  return Number.isFinite(meses) && meses >= 1 ? meses : 12;
}

function directorioArchivo(valor = process.env.AUDIT_ARCHIVE_DIR) {
  return valor && valor.trim() ? path.resolve(valor.trim()) : path.join(__dirname, "..", "..", "archivo-auditoria");
}

// CSV con punto y coma y BOM, para que Excel en español lo abra con tildes y en columnas
function campoCsv(valor) {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function lineaCsv(fila) {
  return COLUMNAS.map((columna) => campoCsv(fila[columna])).join(";");
}

async function agregarAlArchivo(ruta, lineas) {
  const nuevo = !fs.existsSync(ruta);
  const archivo = await fs.promises.open(ruta, "a");
  try {
    await archivo.writeFile(`${nuevo ? `\uFEFF${COLUMNAS.join(";")}\r\n` : ""}${lineas.join("\r\n")}\r\n`, "utf8");
    await archivo.sync();
  } finally {
    await archivo.close();
  }
}

async function archivarAuditoria({ meses = mesesRetencion(), directorio = directorioArchivo(), simular = false, actorId = null } = {}) {
  const mesesValidos = mesesRetencion(meses);
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [filas] = await connection.query(
      `SELECT a.id, a.fecha, a.usuario_id, u.usuario, a.accion, a.tabla_afectada AS tabla, a.detalle
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.fecha < DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       ORDER BY a.fecha, a.id
       FOR UPDATE`,
      [mesesValidos],
    );
    const porAnio = new Map();
    for (const fila of filas) {
      const anio = String(fila.fecha).slice(0, 4);
      if (!porAnio.has(anio)) porAnio.set(anio, []);
      porAnio.get(anio).push(fila);
    }
    const archivos = [...porAnio.keys()].map((anio) => path.join(directorio, `auditoria-${anio}.csv`));
    if (simular || !filas.length) {
      await connection.rollback();
      transactionStarted = false;
      return { archivados: filas.length, archivos, meses: mesesValidos, simulado: simular };
    }

    fs.mkdirSync(directorio, { recursive: true });
    for (const [anio, grupo] of porAnio) {
      await agregarAlArchivo(path.join(directorio, `auditoria-${anio}.csv`), grupo.map(lineaCsv));
    }
    const ids = filas.map((fila) => fila.id);
    for (let i = 0; i < ids.length; i += 1000) {
      const lote = ids.slice(i, i + 1000);
      await connection.query(`DELETE FROM auditoria WHERE id IN (${lote.map(() => "?").join(", ")})`, lote);
    }
    await connection.commit();
    transactionStarted = false;

    await registrarAuditoria({
      usuarioId: actorId,
      accion: "ARCHIVAR_AUDITORIA",
      tabla: "auditoria",
      detalle: `${filas.length} registros con más de ${mesesValidos} meses archivados en ${archivos.map((ruta) => path.basename(ruta)).join(", ")}`,
    });
    return { archivados: filas.length, archivos, meses: mesesValidos, simulado: false };
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { archivarAuditoria, mesesRetencion, directorioArchivo, lineaCsv };
