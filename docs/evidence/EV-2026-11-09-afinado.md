# Evidencia de la ronda de afinado (2026-11-09)

- Ambiente: Windows 11, Node.js 22.21.0, MariaDB 10.4.32 (XAMPP). Bases desechables `meviplast_e2e` y `meviplast_browser`; pruebas manuales en `meviplast_prueba`.
- Código: rama `feature/MEVI-62-variantes-y-ubicacion`, sobre `develop` en `c529eea` (PR #64).
- Origen: pruebas manuales del equipo en `meviplast_prueba` y recomendación del instructor sobre la auditoría. Las decisiones quedan como CR-015 y CR-016 del equipo por delegación de MEVIPLAST (`docs/requirements/decisiones-por-delegacion.md`).
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-09-01 · CP-081, CP-082: formato de la variante (RN-025) y sin ubicación (CR-015)

Hallazgo: el ingreso de inventario aceptaba «eddc» como medida y «eew» como calibre, y pedía una ubicación que ningún requisito usa.

| Caso | Resultado |
| --- | --- |
| CP-081 medida «10x15», «10 X 15», «6*12», «40x60 CM», «12,5 × 18» | Se guardan como «10 x 15», «6 x 12», «40 x 60 cm», «12.5 x 18» |
| CP-081 medida «eddc», «10», «0 x 15», «10 x 15 metros» | 400 «La medida debe ser ancho x largo…» |
| CP-081 calibre «0,95» y «1.50» / «eew», «0», «2 mm» | «0.95» y «1.5» / 400 |
| CP-081 color «  BLANCO   hueso » / «essd123», «Rojo!», «Az» | «Blanco hueso» / 400 |
| CP-081 la misma regla en inventario, órdenes, plantillas y bobinas | Correcto (servidor y panel) |
| CP-082 migración `20261109_drop_unused_columns.sql` sobre una base con las columnas, aplicada dos veces | Quita `inventario.ubicacion` y `produccion.lote`; mismas filas |

- **DEF-018:** los campos numéricos aceptaban «e», «+» y «-» (notación científica del navegador); «43e» llegaba vacío y el aviso decía «Completa el campo». Corregido: esas teclas y el pegado se bloquean, y un valor no numérico avisa «debe ser un número». Comprobado en Chrome: escribir «43e+-5» deja «435».

## EV-2026-11-09-02 · CP-083, CP-084: auditoría liviana y con búsqueda (CR-016)

| Caso | Resultado |
| --- | --- |
| CP-083 inicio de sesión correcto y fallido | 0 filas nuevas en `auditoria`; dos líneas en `backend/logs/accesos-2026-11-09.log` con usuario e IP |
| CP-083 bloqueo de cuenta | Sigue en `auditoria` (BLOQUEO_CUENTA) |
| CP-083 `GET /api/reportes/auditoria?accion=…&desde=…` | Solo esa acción, con total y páginas de 20 |
| CP-083 filtro `desde=09/11/2026` o acción con comillas | 400 |
| CP-083 vista Auditoría en `meviplast_prueba`, «Crear orden producción» desde el 01/10/2026 | 7 eventos, los mismos que la consulta directa |
| CP-084 `npm run auditoria:archivar -- --simular` | Informa, no escribe ni borra |
| CP-084 archivo de 2 registros con más de 12 meses y 1 reciente | `auditoria-AAAA.csv` con los 2 (el «;» del detalle entre comillas), el reciente se queda, un evento ARCHIVAR_AUDITORIA; una segunda corrida no repite |
| Archivos de log con más de 90 días | Se borran; los demás y otros archivos se conservan |

- **DEF-019:** si una respuesta correcta llegaba cortada (por ejemplo, al cambiar de página mientras cargaba), `api()` la tomaba como `{}` y la pantalla de Inicio fallaba (`inventory.reduce is not a function`, visto una vez en la prueba de navegadores). Corregido: se muestra el aviso de error.

## EV-2026-11-09-03 · CP-085: regresión completa (RNF-007)

| Comando | Resultado |
| --- | --- |
| `npm run lint` (backend y frontend) | Sin errores |
| `npm test --prefix backend` | 90 de 90 (13 nuevas) |
| `npm run test:e2e --prefix backend` | 17 de 17 (2 nuevas) |
| `npm run test:browser --prefix backend` | 42 de 42 flujos sin bloqueo en Edge 157, Chrome 156 y Firefox 157, dos corridas seguidas |
| `npm audit --prefix backend --audit-level=critical` | 0 vulnerabilidades |
| `npm run build --prefix frontend` | Compila |

## Bases locales

| Base | Qué se hizo | Respaldo previo |
| --- | --- | --- |
| `meviplast_prueba` | Migración de CR-015; 75 inicios de sesión pasados a `logins-historicos-meviplast_prueba.csv` y quitados de `auditoria` | `meviplast_prueba-antes-MEVI62-20261109.sql` |
| `meviplast_db` | Migración de CR-015 (registrada en `schema_migrations`, 12 en total); 124 inicios de sesión (04/08 a 27/10/2026) pasados a `logins-historicos-meviplast_db.csv` y quitados; la tabla queda con 44 registros. Inventario (6) y producción (0) sin cambios | `meviplast_db-antes-MEVI62-20261109.sql` con su SHA-256 |

Los respaldos y los CSV se guardan fuera del repositorio (`Respaldos_MEVIPLAST`); `backend/logs` y `backend/archivo-auditoria` están en `.gitignore`.
