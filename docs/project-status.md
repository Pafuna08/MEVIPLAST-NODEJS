# Estado del proyecto

Corte: 27/11/2026. Versión estable `v1.0.0` en `main` (PR #127); `develop` con los PR #1 a #138 (después de la v1.0.0: índices y firmas del paquete documental, recuperación por correo en Render con Brevo, el mensaje del correo no configurado, la revisión completa de la documentación y los diagramas, y los permisos de inventario terminado del supervisor, DEF-044). Sprints 0 a 10 numerados como en el tablero de Jira del equipo; el Sprint 10 (PR #53 a #127) cerró con la versión 1.0.0.

- Trazabilidad y estado por historia: [`requirements/traceability.md`](requirements/traceability.md). La fuente única es la Matriz Maestra de Trazabilidad del paquete documental.
- Pruebas: [`testing/strategy.md`](testing/strategy.md). 171 unitarias, 24 E2E con MySQL, prueba de carga y 21 flujos en cada uno de Edge, Chrome y Firefox (63); cobertura de 79,0 % con unitarias y 91,6 % con E2E (medida el 25/11/2026); contraste WCAG AA medido en 56 vistas sin fallas (EV-2026-11-25-10).
- Paquete documental ADSO: los 16 entregables siguen las plantillas institucionales que envió el instructor el 08/11/2026 (la versión vigente de cada uno está en el Índice Maestro, con las capturas del diseño nuevo, más la Rúbrica Integral de Evaluación; todas las versiones tienen la revisión y la aprobación del equipo, y la aprobación del instructor está pendiente); los diagramas de arquitectura tienen su fuente en [`architecture/diagramas.md`](architecture/diagramas.md) y los 30 diagramas de casos de uso (actores, general, uno por épica y uno por cada caso) en `Documentacion_Proyecto_ADSO/02_Requisitos/diagramas`, generados desde el código con `fuente/generar_cu.js`.
- Decisiones del equipo por delegación del cliente: [`requirements/decisiones-por-delegacion.md`](requirements/decisiones-por-delegacion.md).
- API: [`api/endpoints.md`](api/endpoints.md) y contrato [`api/openapi.json`](api/openapi.json), publicado con Swagger UI en `/api-docs` (CR-024).
- Datos: [`data/schema.md`](data/schema.md) y diagrama entidad-relación [`data/er.md`](data/er.md).
- Evidencias: [`evidence/README.md`](evidence/README.md).
- Decisiones: [`adr/`](adr/) (ADR-001 a ADR-004).
- Manual de usuario: [`user-guide.md`](user-guide.md).
- Revisión documental anterior: [`adso-review-2026-10-20.md`](adso-review-2026-10-20.md) (histórica, describe `develop` en `f89abcb`).

Las 25 historias están implementadas (25 de 25) y los 29 requisitos funcionales también (29 de 29): el 24/11/2026 se completaron HU-004, HU-010, HU-020 y HU-023 (PR #107 a #109) y HU-017 quedó cerrada por la decisión CR-025 (permisos fijos por rol). MEVIPLAST aprobó el alcance en la reunión inicial y delegó en el equipo las decisiones pendientes; las preguntas del Acta de Aceptación por Rol (MEV-ACT-01) se resolvieron por esa delegación el 08/11/2026 (DEF-007 y HU-022 incluidos). La sesión de aceptación con usuarios de la empresa no se realizó y el acta no tiene firma del cliente.

## Pendiente después de `v1.0.0`

- Aprobación del instructor de la entrega y del paquete documental.
- Que Carlos Herrera revise los PR #124 a #126 y desde el #128 (el #127, que llevó todo a `main`, ya lo aprobó). Ya revisó los 112 PR del #12 al #123: aprobó 104 en GitHub y dio visto bueno a 8 en su commit de fusión (#55 a #58 y #60 a #63). La instalación limpia ya la repitió en su equipo (RNF-009 cumple, EV-2026-11-08-05).

## Limitaciones conocidas de la entrega

- Sin sesión de aceptación con usuarios de MEVIPLAST: la usabilidad (RNF-006) no se midió con ellos.
- La recuperación por correo se probó con el buzón Gmail del proyecto en local (CP-030, EV-2026-11-08-04) y con la API de Brevo en Render (CP-118, EV-2026-11-27-01), no con un servidor de correo corporativo de MEVIPLAST.
- Las pruebas de carga y de navegadores se hicieron en un equipo del equipo de desarrollo, no en el servidor de MEVIPLAST; la disponibilidad no se midió.
- La versión de demostración (https://meviplast.onrender.com, CR-023) usa el plan gratuito de Render, que se duerme sin uso, y una base de Aiven pagada con créditos de prueba que vencen hacia el 11/12/2026; sin un medio de pago, Aiven apaga la base. El último respaldo es del 25/11/2026, con los datos de demostración de tres meses, y se restauró de prueba sin diferencias ([`operations/despliegue-render.md`](operations/despliegue-render.md), sección 5).

Este archivo describe el código y sus pruebas, no la aprobación del instructor ni la aceptación del cliente. Los documentos Word y Excel del paquete documental están en [`Documentacion_Proyecto_ADSO`](Documentacion_Proyecto_ADSO/LEEME.md), por indicación del instructor.
