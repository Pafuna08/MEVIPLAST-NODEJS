# Matriz de trazabilidad (borrador vivo)

- Código: DOC-04-MEV-01
- Versión: 1.1
- Fecha: 2026-10-21
- Estado: En revisión; requiere aprobación del equipo e instructor.
- Responsable, revisión y aprobación formal: pendientes de asignar.

Fuentes: `MEVIPLAST-0.2.docx` (IDs HU-001–HU-025) y, como antecedente de criterios, `DOCUMENTO PROYECTO INTEGRADOR ING. DE SOFTWARE.docx` (IDs HU-01–HU-25). No se asume que ambas series sean intercambiables sin confirmación del equipo. Revisión estática de `feature/MEVI-9-completar-backlog`, HEAD `9f49d80`, con cambios locales sin commit. Esta matriz no es una aceptación formal ni sustituye la aprobación del cliente o instructor.

La guía pide una cadena problema → objetivo → stakeholder → alcance → requisito → regla → historia/caso → diseño → componente → código → prueba → evidencia → entrega. Los códigos `PRO`, `OBJ`, `RN`, `CU`, `UI`, `CMP`, `CP` y `ENTG` no están asignados consistentemente en el Word; “Pendiente” no debe sustituirse por IDs inventados. Los stakeholders se refieren a los identificadores del registro del Word (STK-01…STK-08), sujetos a confirmación.

| Problema / objetivo | Stakeholder | RF/RNF | Regla | HU / CU | UI / componente / código | API | Prueba / evidencia | Entregable / estado |
|---|---|---|---|---|---|---|---|---|
| PRO/OBJ: por asignar desde DOC-01 | STK-03 cliente; STK-04 operarios | RF-001 Producción | RN por aprobar | HU-001–HU-005; CU pendiente | Panel Producción; `frontend/src/DashboardApp.jsx`; `backend/src/services/produccion.service.js` | `/api/produccion`, `/api/produccion/operarios`, `/{id}`, `/{id}/estado`, `/{id}/avance` | Pruebas unitarias de edición parcial, relaciones y transición; integración pendiente | Implementado parcialmente: edición restringida a órdenes pendientes sin avance; consumo de materia prima es explícito, no automático. Aceptación pendiente. |
| PRO/OBJ: por asignar desde DOC-01 | STK-03 cliente; STK-06 área administrativa; almacenista | RF-002 Materias primas | RN por aprobar | HU-006–HU-010; CU pendiente | Panel Materias para admin, supervisor y almacenista; `backend/src/services/materiaPrima.service.js` | `/api/materia-prima`, `/bajo-stock`, `/{id}`, `/movimientos`, `/{id}/movimientos` | Pruebas unitarias de compra transaccional y rollback por stock insuficiente; integración pendiente | Implementado: saldo y ledger se actualizan en transacción; compras y ajustes para almacén, consumo asociado a orden para admin/supervisor. Aceptación pendiente. |
| PRO/OBJ: por asignar desde DOC-01 | STK-03 cliente; STK-06 área administrativa; almacenista | RF-003 Inventario | RN por aprobar | HU-011, HU-012, HU-014; CU pendiente | Panel Inventario/Producción/Ventas; servicios de inventario, producción y ventas | `/api/inventario`, `/api/inventario/movimientos`, `/{id}/salida`, avance de producción, `/api/ventas` | Ledger escrito en la transacción de ingresos, avances, salidas y ventas; integración pendiente | Implementado: saldo y movimientos de inventario quedan vinculados a actor, orden o venta cuando aplica. Aceptación pendiente. |
| PRO/OBJ: por asignar desde DOC-01 | STK-05 vendedores; STK-03 cliente | RF-004 Ventas | RN por aprobar | HU-013, HU-014, HU-024; CU pendiente | Panel Ventas para vendedor, supervisor y admin | `/api/ventas`, `/api/reportes/ventas`, `/api/inventario` (consulta de existencias) | Permisos, aislamiento de ventas del vendedor y stock transaccional requieren integración | Implementado parcialmente: vendedor registra y consulta solo sus ventas; stock se descuenta y genera movimiento en una transacción. Sin comprobante. Aceptación pendiente. |
| PRO/OBJ: por asignar desde DOC-01 | STK-01 líder; STK-03 cliente; usuarios | RF-005 Seguridad | RN de permisos por aprobar | HU-016, HU-017, HU-020; HU-018/HU-019 pendientes | Login y panel; `frontend/src/DashboardApp.jsx`, `backend/src/middleware/auth.middleware.js` | `/api/auth/login`, `/api/usuarios` | Pruebas de integración de autenticación, permisos y revocación pendientes | Parcial: JWT/bcrypt y roles presentes; no se localizaron recuperación ni bloqueo de intentos. |
| PRO/OBJ: por asignar desde DOC-01 | STK-03 cliente; STK-06 área administrativa | Reportes / RNF | Métricas/umbrales por aprobar | HU-021–HU-025 | Panel Reportes; `reportes.service.js` | `/api/reportes/produccion`, `/ventas`, `/inventario`, `/auditoria` | CP de resultados y RNF pendiente | Parcial: resúmenes/bitácora; sin rendimiento por operario ni exportación Excel. |

## Estado preliminar por historia

Los estados describen lo encontrado en código y pruebas automatizadas de esta rama. “En código; sin aceptación” no significa que la historia esté terminada: aún falta validar criterios con usuarios y, cuando corresponda, integración con MySQL.

| ID | Historia (resumen) | Estado observado | Evidencia / brecha a validar |
|---|---|---|---|
| HU-001 | Asignar tareas de producción | Parcial | Confirmar asignación, cantidades, fechas y aceptación del flujo. |
| HU-002 | Consultar tareas asignadas | En código; sin aceptación | Validar que el operario autenticado solo consulte sus tareas. |
| HU-003 | Registrar producción realizada | En código; sin aceptación | Hay registro de avances; faltan pruebas de integración y aceptación. |
| HU-004 | Consultar historial de producción | Parcial | Confirmar filtros por operario, fecha y producto. |
| HU-005 | Modificar órdenes de producción | Parcial | Solo se permite editar órdenes pendientes sin avances; integración y aceptación pendientes. |
| HU-006 | Registrar materias primas | En código; sin aceptación | Servicio/API y movimientos; falta validar en MySQL. |
| HU-007 | Actualizar cantidades disponibles | Parcial | Hay entradas/salidas con ledger; confirmar permisos y reglas de almacén. |
| HU-008 | Registrar consumo de materiales | Parcial | Consumo explícito asociado a orden; confirmar si el negocio requiere automatismo. |
| HU-009 | Consultar disponibilidad de insumos | En código; sin aceptación | Consulta y bajo stock; validar filtros, umbrales y aceptación. |
| HU-010 | Registrar compras de materiales | Parcial | Compra transaccional; confirmar detalle requerido de proveedor, fecha y costo. |
| HU-011 | Registrar productos terminados | En código; sin aceptación | Ingresos y movimientos presentes; validar reglas del proceso. |
| HU-012 | Consultar inventario disponible | En código; sin aceptación | Consulta presente; aceptación e integración pendientes. |
| HU-013 | Registrar ventas | En código; sin aceptación | Registro y aislamiento del vendedor; falta aceptación funcional. |
| HU-014 | Actualizar stock automáticamente | En código; sin aceptación | La venta descuenta stock y crea movimiento en la transacción; falta integración MySQL. |
| HU-015 | Generar reportes de ventas | Parcial | Validar filtros, contenido y formato esperado. |
| HU-016 | Iniciar sesión | En código; sin aceptación | JWT/bcrypt presentes; validar expiración y flujos con pruebas de integración. |
| HU-017 | Gestionar roles y permisos | Parcial | Roles de vendedor/almacenista en esta rama; aprobar reglas y probar cada rol. |
| HU-018 | Recuperar contraseña | Pendiente | No localizada; definir flujo y criterio de aceptación. |
| HU-019 | Bloquear intentos fallidos | En código; sin aceptación | 5 intentos seguidos bloquean 15 minutos (configurable); el administrador desbloquea. Pruebas en `auth.lockout.test.js`; falta prueba con MySQL. |
| HU-020 | Cerrar sesión | Parcial | Flujo de logout presente; confirmar revocación de JWT y aceptación. |
| HU-021 | Generar reporte de producción | Parcial | Validar fechas, cantidades y filtros. |
| HU-022 | Consultar rendimiento de operarios | Pendiente | No localizado; acordar indicadores y fórmulas. |
| HU-023 | Generar reporte de inventario | Parcial | Confirmar cobertura de materias primas y productos terminados. |
| HU-024 | Visualizar historial de ventas | Parcial | Confirmar búsqueda por fecha/cliente y permisos. |
| HU-025 | Exportar reportes | Parcial | Imprimir desde navegador no equivale necesariamente a exportar PDF/Excel; definir alcance. |

## Incidencias de trazabilidad del Word

La tabla de la sección 35 relaciona RF-002 con HU-003, RF-003 con HU-004 y RF-004 con HU-005; esas historias corresponden a procesos distintos en el backlog (HU-006–010 materias primas, HU-011–015 inventario/ventas). Los IDs y rangos del backlog se conservan aquí; confirmar cada vínculo con el equipo y el instructor antes de reemplazar la tabla oficial.

Los permisos de vendedor y almacenista se reflejan en backend y navegación. Esta implementación no equivale a aprobación formal de los roles ni de las reglas de negocio originales.

## Evidencia asociada

- `npm test --prefix backend`: 11 pruebas automatizadas aprobadas en la revisión del 2026-10-21, incluida una prueba HTTP de permisos por rol con base de datos simulada.
- Smoke test de aplicación con MariaDB aislado: dashboard, login y rutas seleccionadas por rol aprobados; no cubre todos los endpoints ni constituye aceptación de usuario.
- `npm run build --prefix frontend`: compilación aprobada en la revisión del 2026-10-21; no demuestra aceptación de interfaz.
- `EV-2026-10-19`: evidencia histórica de navegación; no representa aceptación de todos los procesos.
- Migración SQL: probada dos veces en una instancia temporal aislada MariaDB 10.4.32 con esquema previo y datos ficticios; los saldos iniciales no se duplicaron. No se tocó la instancia XAMPP existente. La integración completa y cualquier aplicación a una base compartida/real siguen pendientes.
- `.github/workflows/ci.yml`: revisar ejecución remota antes de registrar evidencia de CI aprobada.