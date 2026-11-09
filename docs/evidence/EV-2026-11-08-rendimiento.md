# Evidencia del reporte de rendimiento de operarios (2026-11-08)

- Ambiente: Windows 11, Node.js 22.21.0, MariaDB 10.4.32 (XAMPP). Bases desechables `meviplast_e2e` y `meviplast_browser`, eliminadas al terminar; `meviplast_db` no se tocó.
- Código: rama `feature/MEVI-54-rendimiento-operarios`, sobre `develop` en `8a0fbf8`.
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## Indicador (HU-022 / RF-027)

MEVIPLAST aprobó el alcance en la reunión inicial y delegó en el equipo las decisiones pendientes. El equipo eligió el **% de cumplimiento de la meta**:

> Cumplimiento = unidades producidas ÷ meta de las órdenes asignadas al operario y creadas en el periodo, sin las canceladas × 100.

- Lo producido de cada orden se limita a su meta.
- Un operario sin órdenes en el periodo aparece con «Sin órdenes», no con 0 %.
- «Unidades registradas» suma todos los avances del operario en el periodo, incluidos los de órdenes creadas antes; es informativo y no entra en el porcentaje.
- Periodos: diario, semanal, mensual y anual, con los mismos límites calendario que los demás reportes.
- Lo consultan el administrador y el supervisor, en pantalla, impreso (PDF) y en Excel.

## EV-2026-11-08-02 · CP-079: API contra MySQL

`npm run test:e2e --prefix backend`: 15 de 15 aprobadas. El caso de HU-022 crea al operario una orden de 200 unidades con un avance de 50 y otra de 999 que se cancela, y comprueba:

| Verificación | Resultado |
| --- | --- |
| El operario activo aparece aunque no tenga órdenes | Correcto |
| Meta +200, producido +50, unidades registradas +50 (la orden cancelada no cuenta) | Correcto |
| Cumplimiento = producido ÷ meta, entre 0 y 100 | Correcto |
| Solo lista operarios | Correcto |
| Operario y vendedor | 403 |
| Periodo `quincenal` | 400 |
| Excel con la fila del operario en la hoja «Por operario» | Correcto |

Pruebas unitarias: 77 de 77 (3 nuevas para el cálculo, la consulta y el Excel). Cobertura: 66,8 % de líneas con unitarias y 83,1 % con unitarias y E2E.

## EV-2026-11-08-03 · CP-080: navegadores (RNF-007)

`npm run test:browser --prefix backend`: **42 de 42 flujos sin bloqueo** (14 flujos en cada navegador), con Edge 156.0.4314.58, Chrome for Testing 156.0.8078.4 y Firefox 157.0. El flujo nuevo entra como supervisor a Reportes, abre «Rendimiento de operarios → Mensual», encuentra la fila del operario con su porcentaje y descarga `reporte-rendimiento-mensual-2026-11-01.xlsx`.

También se revisó la pantalla con los datos de demostración de `meviplast_prueba` (solo lectura): reporte anual con 3 operarios, cumplimiento general del 40,1 % y una barra por operario.
