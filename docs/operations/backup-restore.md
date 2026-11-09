# Respaldo y restauración MySQL

## Estado

Procedimiento manual ensayado el 2026-10-27 en una base desechable (resultado al final de este documento). No es una automatización: cada respaldo lo ejecuta una persona. Falta acordar con el cliente la frecuencia, el RPO y el RTO. Nunca subas respaldos al repositorio.

## Respaldo manual en Windows/XAMPP

1. Detén escrituras de la aplicación o acuerda una ventana de mantenimiento.
2. En PowerShell, ajusta la ruta de XAMPP y el nombre del archivo. El cliente pedirá contraseña si el servidor la requiere; no la agregues en el comando.

```powershell
$dump = "C:\xampp\mysql\bin\mysqldump.exe"
$file = Join-Path $env:TEMP "meviplast_db-$(Get-Date -Format yyyyMMdd-HHmmss).sql"
& $dump --host=localhost --port=3306 --user=root --single-transaction --routines --triggers "--result-file=$file" meviplast_db
if ($LASTEXITCODE -ne 0) { throw "Falló el respaldo MySQL" }
Get-FileHash $file -Algorithm SHA256
```

Guarda el archivo y su hash en una ubicación autorizada fuera del repositorio, con acceso restringido y periodo de retención aprobado.

## Restauración de prueba

Restaura solo en una instancia desechable o tras aprobación explícita: la importación reemplaza o mezcla datos según el contenido del SQL. Verifica tablas, conteos no sensibles, login y una operación funcional; registra los resultados y elimina de forma segura copias temporales conforme a la política local.

En XAMPP, restaurar en una base desechable y comparar los conteos con la original:

```powershell
$mysql = "C:\xampp\mysql\bin\mysql.exe"
& $mysql -u root -e "CREATE DATABASE meviplast_restore_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
Get-Content $file -Raw -Encoding utf8 | & $mysql -u root --default-character-set=utf8mb4 meviplast_restore_test
& $mysql -u root -e "SELECT COUNT(*) FROM meviplast_restore_test.usuarios; SELECT COUNT(*) FROM meviplast_db.usuarios"
& $mysql -u root -e "DROP DATABASE meviplast_restore_test"
```

El 2026-10-27 se ensayó el respaldo y la restauración completos: 11 tablas sin diferencias de conteo (evidencia en [`../evidence/EV-2026-10-27.md`](../evidence/EV-2026-10-27.md)). Falta acordar el RPO y el RTO con el cliente.

## Registros del servidor y archivo de la auditoría (CR-016)

El servidor escribe archivos planos diarios en `backend/logs` (o en `LOG_DIR`):

- `servidor-AAAA-MM-DD.log`: una línea JSON por evento (peticiones a la API sin su cuerpo, avisos y errores).
- `accesos-AAAA-MM-DD.log`: inicios de sesión, intentos fallidos y accesos rechazados por bloqueo, con usuario e IP. Los inicios de sesión ya no se guardan en la tabla `auditoria`; los bloqueos, desbloqueos y cambios de contraseña sí.

Los archivos con más de `LOG_RETENTION_DAYS` días (90 por defecto) se borran solos. Los campos sensibles (contraseñas, tokens, correos) se ocultan igual que en la consola. `LOG_DIR=off` desactiva los archivos.

La tabla `auditoria` conserva `AUDIT_RETENTION_MONTHS` meses (12 por defecto). Lo anterior se archiva con:

```powershell
npm run auditoria:archivar --prefix backend -- --simular   # solo informa cuántos registros se archivarían
npm run auditoria:archivar --prefix backend                # los pasa a auditoria-AAAA.csv y los borra de la tabla
```

El comando escribe primero `auditoria-AAAA.csv` (punto y coma, UTF-8, se abre en Excel) en `backend/archivo-auditoria` (o `AUDIT_ARCHIVE_DIR`), lo guarda en disco y solo entonces borra esas filas, en una transacción: si falla la escritura, no se borra nada. Deja un evento `ARCHIVAR_AUDITORIA` en la tabla. Córrelo después del respaldo diario y guarda los CSV junto con los respaldos.
