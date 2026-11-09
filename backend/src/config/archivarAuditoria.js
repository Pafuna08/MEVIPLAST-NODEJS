/**
 * Archiva la auditoría antigua (CR-016): npm run auditoria:archivar [-- --simular] [-- --meses=12]
 * Usa la base de DB_NAME. Con --simular solo informa cuántos registros se archivarían.
 * Conviene correrlo después del respaldo diario (docs/operations/backup-restore.md).
 */
require("dotenv").config();
const { pool } = require("./database");
const { archivarAuditoria, mesesRetencion, directorioArchivo } = require("../services/archivoAuditoria.service");

async function main() {
  const simular = process.argv.includes("--simular");
  const argumentoMeses = process.argv.find((arg) => arg.startsWith("--meses="));
  const meses = mesesRetencion(argumentoMeses ? argumentoMeses.split("=")[1] : undefined);
  const resultado = await archivarAuditoria({ meses, directorio: directorioArchivo(), simular });
  const base = process.env.DB_NAME || "meviplast_db";
  if (!resultado.archivados) {
    console.log(`${base}: no hay registros de auditoría con más de ${resultado.meses} meses.`);
  } else if (resultado.simulado) {
    console.log(`${base}: se archivarían ${resultado.archivados} registros con más de ${resultado.meses} meses en ${resultado.archivos.join(", ")}. No se cambió nada (--simular).`);
  } else {
    console.log(`${base}: ${resultado.archivados} registros con más de ${resultado.meses} meses archivados en ${resultado.archivos.join(", ")} y borrados de la tabla.`);
  }
}

main()
  .catch((error) => {
    console.error(`No se pudo archivar la auditoría: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
