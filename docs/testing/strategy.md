# Estrategia y estado de pruebas

## Comandos

```powershell
npm test --prefix backend
npm audit --prefix backend --audit-level=critical
npm run build --prefix frontend
```

## Cobertura automatizada

26 pruebas con `node:test` (26 aprobadas el 2026-10-26, commit `a5673a6`):

- `auth.recovery.test.js` (3): correo inválido, token inválido o vencido y consumo del token en una transacción.
- `inventario.service.test.js` (3): variantes del catálogo, rechazo de líneas ajenas y salida manual con ledger.
- `materiaPrima.service.test.js` (4): registro de bobinas, validaciones, compra transaccional y rollback por stock insuficiente.
- `production.service.test.js` (6): edición parcial, plantillas del catálogo, finalización con meta pendiente y alcance del supervisor.
- `reportes.service.test.js` (3): límites de periodo calendario y filtro de ventas por rango.
- `role-access.routes.test.js` (1): permisos HTTP de lectura por rol (base de datos simulada).
- `sanitize.test.js` (3): sanitización de texto, números y objetos.
- `ventas.service.test.js` (3): límite de 500 unidades por paquete, descuento por paquetes y aislamiento del vendedor.

Sin prueba automatizada todavía: registrar avance de producción, crear orden, consumo de materia prima asociado a una orden y login.
- Build: Vite compila la entrada React `frontend/dashboard.html`.
- CI: ejecuta instalación por lockfile, auditoría a nivel crítico, tests backend y build.

## Cobertura pendiente

- Completar pruebas de integración de endpoints con MySQL para todos los flujos y permisos por rol; el smoke test local cubre solo rutas seleccionadas con datos ficticios, incluidos vendedor y almacenista.
- Pruebas E2E para altas, cambios y errores de formularios.
- Validación de rendimiento (<3 s) bajo carga acordada.
- Matriz de compatibilidad y usabilidad en Chrome, Edge y Firefox.
- Respaldo y restauración de base de datos comprobados.
- La migración de roles y ledger se probó en una instancia temporal aislada MariaDB 10.4.32 con datos ficticios y dos ejecuciones; también se probó un conjunto limitado de rutas HTTP contra otra instancia temporal. No se aplicó a una base existente. La cobertura de integración completa, respaldo/restauración y autorización operativa sigue pendiente antes de cualquier aplicación compartida/real.
- La auditoría todavía reporta vulnerabilidades altas transitivas en herramientas de desarrollo; revisar `SECURITY.md`.

Los resultados del smoke test con base aislada están en [`../evidence/EV-2026-10-21.md`](../evidence/EV-2026-10-21.md), los de instalación por lockfile en [`../evidence/EV-2026-10-20.md`](../evidence/EV-2026-10-20.md) y la evidencia histórica de navegación en [`../evidence/EV-2026-10-19.md`](../evidence/EV-2026-10-19.md).
