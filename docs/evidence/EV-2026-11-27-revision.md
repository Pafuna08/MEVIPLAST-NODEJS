# Evidencia: revisión completa de la documentación contra el código (2026-11-27)

- Ambiente: Windows 11, Node.js 22, Edge (Playwright) para dibujar los diagramas, Word para actualizar índices y exportar a PDF.
- Código: `develop` después del PR #136 (`757839f`).
- Origen: pedido del equipo de revisar todo como evaluador y corregir, en todos los archivos, lo que no coincidiera con lo que hace la aplicación (documentos ADSO, documentación del repositorio, Swagger y diagramas), y de mejorar los diagramas de casos de uso.
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-27-02 · DEF-043 · CP-119

### Qué se comparó con el código

| Fuente de verdad | Contra qué se comparó | Resultado |
| --- | --- | --- |
| Rutas y `verificarRol` de `backend/src/routes` (60 operaciones con `/health`) | `docs/api/openapi.json` (rutas, métodos y `x-roles`) | Coinciden las 60 y sus roles; `openapi.test.js` lo confirma |
| Campos que leen los controladores y servicios | Cuerpos y parámetros de Swagger | Todos los campos documentados se usan en el código |
| Vistas de cada rol (`frontend/src/comun/constantes.js`) y vistas del panel | Actores de los casos de uso, fichas y diagramas | Diagramas con el supervisor en ventas (DEF-007 y CR-021), CU-006 y CU-013 con el flujo de antes de CR-014 y CR-026: corregidos |
| `auth.service.js` (correo por Brevo o por SMTP) | Todos los documentos | Varias tablas decían solo «servidor SMTP»: corregidas |
| Pruebas de `backend/tests` | Casos de prueba de las fichas | HU-020, HU-023, RN-004, RN-005, RN-008 y CU-013 decían «Por definir» o «Sin prueba automatizada» aunque tienen prueba: corregidos. RN-003 (correo único) y RN-022 (bajo stock) siguen sin prueba propia |

### Hallazgos y correcciones

| Hallazgo | Corrección |
| --- | --- |
| DEF-043: sin correo configurado, el 503 decía «falta configurar SMTP», también en Render (Brevo) | PR #136: «falta configurar el correo (Brevo o SMTP)»; CP-119 en `auth.correo-no-configurado.test.js` (170 unitarias) |
| Diagramas de casos de uso del 28/10: el supervisor registraba y consultaba ventas; HU-022 figuraba pendiente; «Servidor SMTP» | 30 diagramas nuevos generados desde el código (`02_Requisitos/diagramas/fuente/generar_cu.js`): actores, general por paquetes, uno por épica y uno por cada caso de uso (DIA-CU-001 a DIA-CU-023), con su API, pantalla, historia y reglas |
| CA-HU-001-03 decía que la orden del administrador sin supervisor se rechaza (CR-014 la deja para los supervisores) | Criterio y flujo de CU-006 corregidos en el Alcance y el Backlog |
| Flujo de CU-013 con «Registrar movimiento → Consumo» (antes de CR-026) | Consumo desde Seguimiento, en una ventana con la bobina de la orden |
| Diagramas de arquitectura sin Brevo y sin los módulos nuevos (líneas, perfil, PDF, Swagger) | DIA-001, DIA-002, DIA-003 y DIA-005 en `docs/architecture/diagramas.md` y en el documento de arquitectura |
| RF-023 y RF-027 con actores incompletos; ALC-06 con el rendimiento «en v1.1»; acceso del supervisor a los clientes de las ventas | Corregidos según los permisos del servidor |
| `project-status.md` y `traceability.md` con el corte del 25 y 26/11 | Al día con el PR #137 |

### Observación para decidir (no es un dato desactualizado)

El supervisor tiene permiso en la API para los ingresos y salidas manuales de producto terminado (`POST /inventario` y `/inventario/{id}/salida`), pero el panel no le muestra la vista de Inventario. Los documentos y el diagrama de CU-016 lo dicen así. Es el mismo patrón de DEF-007 (permiso de venta sin vista), que se resolvió quitando el permiso; aquí la decisión queda para el equipo.

### Verificación

- `npm test --prefix backend`: 170 de 170. `openapi.test.js` y `api-docs.test.js`: 6 de 6 después de cambiar Swagger.
- Los 13 Word se abrieron con Word, se actualizaron sus índices y se exportaron a PDF sin páginas en blanco.
- Respaldo previo del paquete: `Respaldos_MEVIPLAST/Documentacion_ADSO_antes_revision_20261127`.
