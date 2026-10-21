# Matriz de trazabilidad (borrador vivo)

- Código: DOC-04-MEV-01
- Versión: 1.0
- Fecha: 2026-10-20
- Estado: En revisión; requiere aprobación del equipo e instructor.
- Responsable, revisión y aprobación formal: pendientes de asignar.

Fuente: requisitos e historias de `MEVIPLAST.docx`, contrastados con `develop` (`f89abcb`). Esta matriz corrige cruces evidentes de la sección 35; requiere aprobación de cliente/instructor y criterios de aceptación por historia.

La guía pide una cadena problema → objetivo → stakeholder → alcance → requisito → regla → historia/caso → diseño → componente → código → prueba → evidencia → entrega. Los códigos `PRO`, `OBJ`, `RN`, `CU`, `UI`, `CMP`, `CP` y `ENTG` no están asignados consistentemente en el Word; “Pendiente” no debe sustituirse por IDs inventados. Los stakeholders se refieren a los identificadores del registro del Word (STK-01…STK-08), sujetos a confirmación.

| Problema / objetivo | Stakeholder | RF/RNF | Regla | HU / CU | UI / componente / código | API | Prueba / evidencia | Entregable / estado |
|---|---|---|---|---|---|---|---|---|
| PRO/OBJ: por asignar desde DOC-01 | STK-03 cliente; STK-04 operarios | RF-001 Producción | RN por aprobar | HU-001–HU-005; CU pendiente | Panel Producción; `frontend/src/DashboardApp.jsx`; `backend/src/services/produccion.service.js` | `/api/produccion`, `/api/produccion/operarios`, `/{id}/estado`, `/{id}/avance` | CP de integración pendiente; EV-2026-10-19 solo demuestra navegación | ENTG de software; parcial, aceptación pendiente. Sin edición general ni consumo de materia prima. |
| PRO/OBJ: por asignar desde DOC-01 | STK-03 cliente; STK-06 área administrativa; actor almacenista por confirmar | RF-002 Materias primas | RN por aprobar | HU-006–HU-010; CU pendiente | Panel Materias; `backend/src/services/materiaPrima.service.js` | `/api/materia-prima`, `/bajo-stock`, `/{id}` | CP de movimientos pendiente | Parcial: CRUD y bajo stock; no compras, consumo ni ledger. |
| PRO/OBJ: por asignar desde DOC-01 | STK-03 cliente; STK-06 área administrativa | RF-003 Inventario | RN por aprobar | HU-011, HU-012, HU-014; CU pendiente | Panel Inventario/Producción/Ventas; servicios de inventario, producción y ventas | `/api/inventario`, avance de producción, `/api/ventas` | CP transaccional/ledger pendiente | Parcial: producción suma y venta descuenta; falta historial integral. |
| PRO/OBJ: por asignar desde DOC-01 | STK-05 vendedores (rol por confirmar); STK-03 cliente | RF-004 Ventas | RN por aprobar | HU-013, HU-014, HU-024; CU pendiente | Panel Ventas (solo admin visible) | `/api/ventas`, `/api/reportes/ventas` | CP de permisos/stock/total pendiente | Parcial: transacción y descuento de stock; sin comprobante. API admite supervisor, UI no expone la vista. |
| PRO/OBJ: por asignar desde DOC-01 | STK-01 líder; STK-03 cliente; usuarios | RF-005 Seguridad | RN de permisos por aprobar | HU-016, HU-017, HU-020; HU-018/HU-019 pendientes | Login estático, `DashboardApp.jsx`, `auth.middleware.js` | `/api/auth/login`, `/api/usuarios` | CP por rol, expiración y logout pendiente | Parcial: JWT/bcrypt/roles/logout; no recuperación ni bloqueo de intentos. |
| PRO/OBJ: por asignar desde DOC-01 | STK-03 cliente; STK-06 área administrativa | Reportes / RNF | Métricas/umbrales por aprobar | HU-021–HU-025 | Panel Reportes; `reportes.service.js` | `/api/reportes/produccion`, `/ventas`, `/inventario`, `/auditoria` | CP de resultados y RNF pendiente | Parcial: resúmenes/bitácora; sin rendimiento por operario ni exportación Excel. |

## Incidencias de trazabilidad del Word

La tabla de la sección 35 relaciona RF-002 con HU-003, RF-003 con HU-004 y RF-004 con HU-005; esas historias corresponden a procesos distintos en el backlog (HU-006–010 materias primas, HU-011–015 inventario/ventas). Confirmar cada vínculo con el equipo y el instructor antes de reemplazar la tabla oficial.

## Evidencia asociada

- `EV-2026-10-19`: navegación local y build del panel; no representa aceptación de todos los procesos.
- `backend/tests/sanitize.test.js`: tres unitarias, no cubren requisitos funcionales.
- `.github/workflows/ci.yml`: pendiente de ejecución remota en el PR documental.