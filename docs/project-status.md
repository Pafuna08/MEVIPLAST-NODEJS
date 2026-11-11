# Estado del proyecto

Corte: 09/11/2026, rama `develop` con los PR #1 a #68 fusionados. Sin etiqueta de liberación. Sprints 0 a 10 numerados como en el tablero de Jira del equipo; el Sprint 10 (desde el PR #53) está en curso.

- Trazabilidad y estado por historia: [`requirements/traceability.md`](requirements/traceability.md). La fuente única es la Matriz Maestra de Trazabilidad del paquete documental.
- Pruebas: [`testing/strategy.md`](testing/strategy.md). 116 unitarias, 22 E2E con MySQL, prueba de carga y 18 flujos en cada uno de Edge, Chrome y Firefox (54); cobertura de 70,8 % con unitarias y 88,5 % con E2E, medida en CI.
- Paquete documental ADSO: los 16 entregables siguen las plantillas institucionales que envió el instructor el 08/11/2026 (versión 2.1 al PR #68, pendiente de la revisión de Carlos y del instructor, más la Rúbrica Integral de Evaluación); los diagramas de arquitectura tienen su fuente en [`architecture/diagramas.md`](architecture/diagramas.md).
- Decisiones del equipo por delegación del cliente: [`requirements/decisiones-por-delegacion.md`](requirements/decisiones-por-delegacion.md).
- API: [`api/endpoints.md`](api/endpoints.md) y contrato [`api/openapi.json`](api/openapi.json).
- Datos: [`data/schema.md`](data/schema.md) y diagrama entidad-relación [`data/er.md`](data/er.md).
- Evidencias: [`evidence/README.md`](evidence/README.md).
- Decisiones: [`adr/`](adr/) (ADR-001 a ADR-004).
- Manual de usuario: [`user-guide.md`](user-guide.md).
- Revisión documental anterior: [`adso-review-2026-10-20.md`](adso-review-2026-10-20.md) (histórica, describe `develop` en `f89abcb`).

Las 25 historias tienen código: 20 implementadas y 5 parciales. MEVIPLAST aprobó el alcance en la reunión inicial y delegó en el equipo las decisiones pendientes; las preguntas del Acta de Aceptación por Rol (MEV-ACT-01) se resolvieron por esa delegación el 08/11/2026 (DEF-007 y HU-022 incluidos). La sesión de aceptación con usuarios de la empresa no se realizó y el acta no tiene firma del cliente.

## Pendiente antes de `v1.0.0`

- Que Carlos Herrera revise los PR #51 a #68; los PR #12 a #50 los aprobó el 03/11/2026. La instalación limpia ya la repitió en su equipo (RNF-009 cumple, EV-2026-11-08-05).
- Decisión del equipo de crear la etiqueta `v1.0.0` y el PR de `develop` a `main`.

## Limitaciones conocidas de la entrega

- Sin sesión de aceptación con usuarios de MEVIPLAST: la usabilidad (RNF-006) no se midió con ellos.
- La recuperación por correo se probó con el buzón Gmail del proyecto (CP-030, EV-2026-11-08-04), no con un servidor de correo corporativo de MEVIPLAST.
- Las pruebas de carga y de navegadores se hicieron en un equipo del equipo de desarrollo, no en el servidor de MEVIPLAST; la disponibilidad no se midió.

Este archivo describe el código y sus pruebas, no la aprobación del instructor ni la aceptación del cliente. Los documentos Word y Excel del paquete documental están en [`Documentacion_Proyecto_ADSO`](Documentacion_Proyecto_ADSO/LEEME.md), por indicación del instructor.
