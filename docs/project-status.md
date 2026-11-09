# Estado del proyecto

Corte: 08/11/2026, rama `develop` con los PR #1 a #57 fusionados. Sin etiqueta de liberación.

- Trazabilidad y estado por historia: [`requirements/traceability.md`](requirements/traceability.md). La fuente única es la Matriz Maestra de Trazabilidad del paquete documental.
- Pruebas: [`testing/strategy.md`](testing/strategy.md). 77 unitarias, 15 E2E con MySQL, prueba de carga y 14 flujos en Edge, Chrome y Firefox; cobertura medida en CI.
- Decisiones del equipo por delegación del cliente: [`requirements/decisiones-por-delegacion.md`](requirements/decisiones-por-delegacion.md).
- API: [`api/endpoints.md`](api/endpoints.md) y contrato [`api/openapi.json`](api/openapi.json).
- Datos: [`data/schema.md`](data/schema.md) y diagrama entidad-relación [`data/er.md`](data/er.md).
- Evidencias: [`evidence/README.md`](evidence/README.md).
- Decisiones: [`adr/`](adr/) (ADR-001 a ADR-004).
- Manual de usuario: [`user-guide.md`](user-guide.md).
- Revisión documental anterior: [`adso-review-2026-10-20.md`](adso-review-2026-10-20.md) (histórica, describe `develop` en `f89abcb`).

Las 25 historias tienen código: 20 implementadas y 5 parciales. MEVIPLAST aprobó el alcance en la reunión inicial y delegó en el equipo las decisiones pendientes; las preguntas del Acta de Aceptación por Rol (MEV-ACT-01) se resolvieron por esa delegación el 08/11/2026 (DEF-007 y HU-022 incluidos). La sesión de aceptación con usuarios de la empresa no se realizó y el acta no tiene firma del cliente.

## Pendiente antes de `v1.0.0`

- Que Carlos Herrera repita la instalación en su equipo (RNF-009) y revise los PR posteriores al #50; los PR #12 a #50 los aprobó el 03/11/2026. El autor ya repitió la instalación desde un clon nuevo (EV-2026-11-08-01).
- Completar y firmar la declaración de uso de IA ([`legal/ai-use.md`](legal/ai-use.md)).
- Decisión del equipo de crear la etiqueta `v1.0.0` y el PR de `develop` a `main`.

## Limitaciones conocidas de la entrega

- Sin sesión de aceptación con usuarios de MEVIPLAST: la usabilidad (RNF-006) no se midió con ellos.
- La recuperación de contraseña se probó con un servidor SMTP local, no con el correo de la empresa (CP-030).
- Las pruebas de carga y de navegadores se hicieron en un equipo del equipo de desarrollo, no en el servidor de MEVIPLAST; la disponibilidad no se midió.

Este archivo describe el código y sus pruebas, no la aprobación del instructor ni la aceptación del cliente. Los documentos Word fuente se mantienen fuera del repositorio para no exponer datos personales.
