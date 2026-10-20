# Estado del proyecto y revisión documental

- Fecha de revisión: 2026-10-19
- Repositorio/base revisada: `Pafuna08/MEVIPLAST-NODEJS`, `develop` tras PR #10 (`f89abcb`).
- Criterio: separar “implementado en código” de “probado” y de “aceptado”.
- Documento de entrada: `MEVIPLAST- ACTUALIZADA (2) - corregida.docx`, aportado fuera del repositorio. No se copia aquí para evitar publicar nombres, correos y otros datos personales del Word.

## Matriz de estado

| Requisito/documento | Estado observado | Evidencia en código | Pendiente |
|---|---|---|---|
| Login, JWT, hash de contraseña | Parcial | `auth.service.js`, `auth.middleware.js` | Probar expiración, permisos y configuración segura; no hay recuperación ni bloqueo de intentos |
| Roles | Parcial | Enum y middleware: admin, supervisor, operario | Alinear historias con roles reales; vendedor y almacenista no son roles del sistema |
| Producción | Parcial | Crear/listar órdenes, cambiar estado y registrar avance | No hay edición completa de orden ni consumo automático de materia prima; ampliar pruebas de propiedad/permisos |
| Materias primas | Parcial | Crear, consultar, actualizar, eliminar y bajo stock | No hay compras ni ledger de entradas/salidas/consumo trazable |
| Inventario terminado | Parcial | Ingresos, salidas, incrementos de producción y descuentos de ventas | Falta historial integral de movimientos y pruebas de trazabilidad |
| Ventas | Parcial | Registrar, calcular total en MySQL, transacción y descuento de stock | Sin comprobante; API permite admin/supervisor pero el menú actual solo muestra ventas a admin |
| Reportes | En código; aceptación pendiente | Resúmenes de producción, ventas e inventario y auditoría | Sin rendimiento por operario ni exportación Excel; impresión depende del navegador |
| Historias HU-018/019/025 | No implementadas/evidenciadas | No se encontraron rutas de recuperación, bloqueo o Excel | Confirmar alcance o planificar historias; no marcarlas completadas |
| Cronograma | Desactualizado como plan vigente | El Word indica que el plan terminó el 15/09/2026 | Sustituir por calendario y avance aprobados; conservar fechas viejas solo como antecedente |
| RNF rendimiento/availability/compatibilidad | No verificados | No hay mediciones ni matriz de navegadores | Acordar escenarios, objetivos y conservar resultados |
| Pruebas | Parcial | 3 unitarias de sanitización; build Vite | Falta integración, E2E, permisos y aceptación; ver estrategia y evidencias |
| Red interna/despliegue | Requisito, no verificado | Configuración local únicamente | Probar binding, firewall, respaldo/restauración y despliegue del entorno destino |
| Manual de usuario por perfil | Pendiente | No localizado como artefacto versionado | Elaborar pasos por rol, capturas no sensibles y validar con usuarios |
| Acta de conformidad/cierre | Pendiente | No localizada | Requiere aprobación del cliente/instructor y evidencia de aceptación |
| Release/tag y paquete final | Pendiente | No hay versión estable etiquetada | Aprobar licencia, versión, changelog final y paquete reproducible antes de declarar entrega |

## Diferencias que deben corregirse en el documento Word

1. Las historias aparecen como “Identificado”; actualizar estados individuales a implementado, parcial, pendiente o descartado, con evidencia y aprobador.
2. Sustituir “vendedor” y “almacenista” por roles existentes o aprobar su incorporación antes de describirlos como usuarios del sistema.
3. Separar gestión agregada de materias primas de historial de compras/consumos, que todavía no existe.
4. Aclarar que los cambios de producción permiten cambiar estado, no editar libremente todos los datos de una orden.
5. Actualizar el cronograma vencido y no declarar como aceptadas las pruebas no realizadas.
6. La sección que decía que no se ejecutaron pruebas quedó desactualizada para esta revisión: ver EV-2026-10-19. Las brechas restantes siguen abiertas.
7. Mantener red local, rendimiento, compatibilidad y aceptación como pendientes mientras no existan pruebas del entorno objetivo.
8. El manual de usuario, acta de conformidad y paquete final son entregables pendientes; la guía de instalación técnica no los reemplaza.

## Artefactos de repositorio

Ya se documentan instalación, configuración, ejecución, pruebas, arquitectura, API, datos, colaboración, seguridad y evidencias. La licencia legal sigue pendiente de aprobación de los titulares; no se inventa una licencia. Tampoco se declara que exista una política de backups, OpenAPI completo, migraciones reversibles, lint o aceptación formal.