# Respaldo y restauración MySQL

## Estado

Este procedimiento es una guía operativa, no una automatización validada. El equipo debe ensayarlo en una base desechable y registrar fecha, versión, responsable y resultado antes de considerarlo un control de recuperación aprobado. Nunca subas respaldos al repositorio.

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

Los comandos exactos de restauración dependen de la instalación XAMPP/MySQL, credenciales y destino. No existe todavía una evidencia de restauración exitosa ni un RPO/RTO acordado.