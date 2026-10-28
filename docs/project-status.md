# Estado del proyecto

Corte: 28/10/2026, rama `develop` con los PR #1 a #50 fusionados. Sin etiqueta de liberación.

- Trazabilidad y estado por historia: [`requirements/traceability.md`](requirements/traceability.md). La fuente única es la Matriz Maestra de Trazabilidad del paquete documental.
- Pruebas: [`testing/strategy.md`](testing/strategy.md). 70 unitarias, 14 E2E con MySQL, prueba de carga y prueba en Edge, Chrome y Firefox; cobertura medida en CI.
- API: [`api/endpoints.md`](api/endpoints.md) y contrato [`api/openapi.json`](api/openapi.json).
- Datos: [`data/schema.md`](data/schema.md) y diagrama entidad-relación [`data/er.md`](data/er.md).
- Evidencias: [`evidence/README.md`](evidence/README.md).
- Decisiones: [`adr/`](adr/) (ADR-001 a ADR-004).
- Manual de usuario: [`user-guide.md`](user-guide.md).
- Revisión documental anterior: [`adso-review-2026-10-20.md`](adso-review-2026-10-20.md) (histórica, describe `develop` en `f89abcb`).

## Pendiente antes de `v1.0.0`

- Revisión y aprobación de los PR #12 a #38 por Carlos Herrera, y que él repita la instalación en su equipo (RNF-009).
- Sesión de aceptación con el cliente usando el Acta de Aceptación por Rol (MEV-ACT-01 del paquete documental).
- Aceptación del cliente por rol.
- Probar la recuperación de contraseña con el SMTP real y repetir las pruebas de carga y de navegadores en el servidor de MEVIPLAST.
- Completar y firmar la declaración de uso de IA ([`legal/ai-use.md`](legal/ai-use.md)).

Este archivo describe el código y sus pruebas, no la aprobación del instructor ni la aceptación del cliente. Los documentos Word fuente se mantienen fuera del repositorio para no exponer datos personales.
