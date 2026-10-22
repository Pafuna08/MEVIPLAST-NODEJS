# Estrategia y estado de pruebas

## Comandos

```powershell
npm test --prefix backend
npm audit --prefix backend --audit-level=critical
npm run build --prefix frontend
```

## Cobertura automatizada

- Unitarias y rutas: sanitización en `backend/tests/sanitize.test.js`; edición parcial/relaciones y cambios de estado de producción en `backend/tests/production.service.test.js`; transacción y rollback de movimientos en `backend/tests/materiaPrima.service.test.js` e `inventario.service.test.js`; aislamiento de ventas en `backend/tests/ventas.service.test.js`; permisos HTTP de lectura por rol en `backend/tests/role-access.routes.test.js` (base de datos simulada).
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

Los resultados vigentes están en [`../evidence/EV-2026-10-20.md`](../evidence/EV-2026-10-20.md) y la evidencia histórica de navegación en [`../evidence/EV-2026-10-19.md`](../evidence/EV-2026-10-19.md).
