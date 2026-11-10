# Decisiones del equipo por delegación del cliente

Registro del 08/11/2026. Responsables: Pablo E. Fuenmayor Osuna y Carlos Herrera Sibaja.

## Contexto

MEVIPLAST aprobó el alcance del sistema en la reunión inicial con el equipo y dejó en sus manos las decisiones de implementación. El equipo informó que no habrá una nueva reunión con un representante de la empresa, así que:

- La sesión de aceptación por rol del Acta MEV-ACT-01 **no se realizó**. El acta no lleva firma del cliente y este registro no la reemplaza ni la simula.
- Las preguntas abiertas del acta (numeral 7) y los cambios y reglas que esperaban ratificación se resuelven aquí como **decisiones del equipo por delegación**, tomando la propuesta que el equipo ya había hecho en el acta.
- La usabilidad con usuarios reales (RNF-006) y las pruebas en el servidor y los equipos de la empresa quedan como limitaciones conocidas de la entrega. La recuperación por correo sí se probó con un buzón real: la cuenta Gmail del proyecto (CP-030, EV-2026-11-08-04).

## Preguntas abiertas del acta

| ID | Pregunta | Decisión del equipo | Estado |
| --- | --- | --- | --- |
| OBS-001 / DEF-007 | ¿El supervisor debe registrar ventas? | No. Se retiró el permiso en la API; consulta ventas, comprobantes y reportes. | Aplicada (PR #55) |
| OBS-002 / RN-024 | ¿Se mantiene el bloqueo de 5 intentos durante 15 minutos? | Se mantiene. | Vigente desde el PR #17 |
| OBS-003 / RN-012, RN-013 | ¿Están completos los catálogos (6 líneas, bobinas PEBD, PEAD y PP)? | Se mantienen los catálogos presentados en la reunión inicial (CR-006). Una línea o un tipo de bobina nuevo se tramita como cambio. | Vigente |
| OBS-004 | ¿Se aprueban los umbrales (≤ 3 s, ≥ 95 % de disponibilidad en horario laboral, 4 de 5 usuarios sin ayuda, respaldo diario con RPO 24 h y RTO 4 h)? | Se aprueban como metas. Se midió el tiempo de respuesta en un equipo local (p95 de 60 a 69 ms); la disponibilidad y la usabilidad no se pudieron medir sin la empresa. | Aprobados; medición parcial |
| OBS-005 | ¿Cuánto se conservan la bitácora de auditoría y el nombre de los clientes en las ventas? | Un año la bitácora; el nombre del cliente, mientras exista la venta. La depuración es manual: el sistema no borra datos solo. | Decidido; procedimiento manual |
| HU-008 | ¿El consumo de materia prima se descuenta solo al registrar el avance? | No: sigue manual en v1.0.0 («Consumo en una orden»). | Vigente |
| HU-010 | ¿Las compras guardan costo y número de factura? | No en v1.0.0; se evaluará en v1.1. | Diferido a v1.1 |
| HU-022 | ¿Qué indicador mide el rendimiento por operario? | % de cumplimiento de la meta: producido ÷ meta de las órdenes asignadas y creadas en el periodo, sin las canceladas. | Aplicada (PR #56) |
| CR-010 | ¿Se incluyen en el MVP el comprobante de venta y la exportación a Excel? | Sí. | Ratificado |

## Cambios y reglas ratificados por delegación

| ID | Qué establece | Decisión |
| --- | --- | --- |
| CR-002 | Vendedor y almacenista son roles del sistema (5 roles) | Ratificado |
| CR-004 | Recuperación de contraseña y recordatorio de usuario por correo | Ratificado |
| CR-005 | Las órdenes del administrador pasan por un supervisor antes del operario; plantillas de órdenes | Ratificado, con el ajuste de CR-014 |
| CR-006 | Catálogos cerrados (3 tipos de bobina y 6 líneas) y ventas por paquetes | Ratificado |
| CR-010 | Comprobante de venta y exportación a Excel en el MVP | Ratificado |
| CR-013 | El operario inicia la orden; administrador y supervisor solo cancelan; se finaliza al completar la meta | Ratificado |
| CR-014 | La orden del administrador queda pendiente para todos los supervisores; si falta el supervisor, el administrador asigna | Ratificado |
| CR-015 | Se quita la ubicación del inventario terminado (todo el producto se guarda en el mismo lugar y ningún requisito la pide) y se elimina la columna `lote`, sin uso; medida, calibre y color pasan a tener formato (RN-025). Origen: pruebas del equipo del 09/11/2026 | Decisión del equipo por delegación |
| CR-016 | Auditoría más liviana y con búsqueda, por recomendación del instructor (09/11/2026): los inicios de sesión salen de la tabla y van al archivo diario `accesos-AAAA-MM-DD.log`; el registro del servidor también queda en archivos diarios (`servidor-AAAA-MM-DD.log`) que se borran a los 90 días; la vista Auditoría filtra en el servidor por fechas, usuario, acción, módulo y texto, por páginas; los registros con más de 12 meses se archivan en `auditoria-AAAA.csv` y salen de la tabla con `npm run auditoria:archivar`. Con esto se define la retención pendiente en OBS-005 | Decisión del equipo por delegación |
| CR-017 | Reglas de las órdenes tras la segunda ronda de pruebas del equipo (09/11/2026): materia prima obligatoria en órdenes, edición y plantillas (RN-026), color de una lista fija (RN-025) y, en Ventas, la lista de referencias en existencia de cada línea | Decisión del equipo por delegación |
| CR-018 | Topes de cantidades tras el sondeo de casos límite del equipo (09/11/2026): ventas de 50, 100 o 500 unidades por paquete, hasta 1 000 paquetes y $100 000 000 por venta; unidades enteras hasta 1 000 000 en órdenes, plantillas, avances e inventario; hasta 100 000 kg por movimiento de bobina | Decisión del equipo por delegación |
| RN-005 | Ruta de la orden de producción (según CR-014) | Aprobada |
| RN-012 | Catálogo de producto terminado (6 líneas) | Aprobada |
| RN-013 | Catálogo de materias primas (PEBD, PEAD, PP con medida, calibre, color y peso) | Aprobada |
| RN-018 | Venta por paquetes de 50, 100 o 500 unidades, hasta 1 000 paquetes y $100 000 000 por venta (según CR-018) | Aprobada; presentaciones y topes por decisión del equipo (CR-018) |
| RN-025 | Formato de la variante: medida «ancho x largo» con unidad opcional (cm, mm, m, in, pulg), calibre numérico mayor que cero con hasta 2 decimales y color de una lista fija (Amarillo, Azul, Blanco, Café, Gris, Morado, Naranja, Natural, Negro, Rojo, Rosado, Transparente y Verde); se guardan normalizados («10x15» → «10 x 15», «cafe» → «Café») | Decisión del equipo por delegación (la lista de colores, tras las pruebas del 09/11/2026) |
| RN-026 | Toda orden de producción y toda plantilla frecuente indican la materia prima (bobina) con la que se produce; al editar una orden se puede cambiar por otra existente, pero no quitar | Decisión del equipo por delegación (pruebas del 09/11/2026) |

## Hallazgos registrados en lugar de los de la sesión

El acta reservaba DEF-016 a DEF-020 para los hallazgos de la sesión. Como la sesión no se realizó, DEF-016 y DEF-017 se usan para los hallazgos de la instalación limpia del 08/11/2026 (EV-2026-11-08-01), ya corregidos en el PR #53:

- **DEF-016** (baja): `db:init` mostraba un error vacío con MySQL apagado.
- **DEF-017** (baja): `db:init` avisaba de migraciones pendientes en una base nueva.

## Qué no cubre este registro

- No es la aceptación firmada por MEVIPLAST ni su medición de usabilidad.
- No sustituye la revisión del instructor. La instalación por una persona distinta al autor (RNF-009) la hizo Carlos Herrera Sibaja en su equipo (EV-2026-11-08-05).
- Si MEVIPLAST pide otra cosa más adelante, se tramita como un cambio nuevo (CR-###).
