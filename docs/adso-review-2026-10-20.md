# Evaluación documental y de coherencia MEVIPLAST

- Código funcional de referencia: `Pafuna08/MEVIPLAST-NODEJS`, rama `develop`, commit `f89abcb` (PR #10).
- Documentos recibidos: `MEVIPLAST.docx` y `Arquitectura_Documental_Proyectos_Software_ADSO_SENA.docx`, 2026-10-20.
- Código de esta revisión: `REV-ADSO-MEVI-001`, versión 1.0.
- Estado: **En revisión; no aprobado por instructor ni cliente.**
- Elaboración: análisis asistido por IA; responsable oficial, revisión y aprobación: pendientes de confirmar.
- Método: contraste estático de documentos, rutas/servicios/esquema y verificaciones locales. No se validó producción, rendimiento, disponibilidad, compatibilidad completa ni aceptación institucional.

## Dictamen ejecutivo

El proyecto tiene un producto funcional de alcance académico: backend Express/MySQL, panel React/Vite para tres perfiles, sitio/login estático, pruebas unitarias básicas, build, documentación viva y workflow CI. **El cumplimiento de la arquitectura ADSO es parcial.** No se debe declarar entrega final: faltan aprobaciones, trazabilidad íntegra, aceptación de usuarios, pruebas integrales y operación validada.

La guía establece tres niveles: marco institucional, documentos del proyecto y evidencias vivas. No exige copiar la guía dentro del Word ni crear documentos duplicados: cada artefacto debe tener fuente principal, responsable, estado, versión y evidencia; el resto debe referenciarlo.

La guía recibida se identifica como “Propuesta base para revisión y adopción” y deja vacías las aprobaciones. Confirmar con instructor/centro si está adoptada oficialmente para esta ficha; hasta entonces, este análisis la usa como referencia solicitada por el equipo, no como norma institucional aprobada.

**Madurez provisional:** prototipo funcional en transición hacia Nivel 2. No se certifica Nivel 2 porque faltan aceptación, casos de integración/E2E, manual de usuario validado y despliegue/restauración reproducibles.

## Evaluación DOC-01 a DOC-10

| Código | Estado observado | Brecha / acción |
|---|---|---|
| DOC-01 Formulación | El Word incluye problema, justificación, objetivos, alcance, recursos y riesgos. | Completar indicadores medibles y aprobación formal. Conservar el cronograma vencido como histórico y añadir el calendario aprobado actual. |
| DOC-02 Gestión | Hay stakeholders, riesgos, comunicación y Scrum. | Falta matriz RACI/equivalente, roadmap real, iteraciones realizadas, dependencias, cambios aprobados y contribución respaldada por Git/actas. |
| DOC-03 Requisitos | Hay alcance, RF, RNF, actores y exclusiones. | Centralizar reglas, permisos y responsables de aceptación. Vendedor/almacenista son actores citados, no roles existentes. |
| DOC-04 Backlog | El Word reporta 25 historias, épicas y puntos. | Las historias siguen como “Identificado”; faltan criterios de aceptación/DoD. La matriz de la sección 35 cruza IDs; usar `requirements/traceability.md` como corrección propuesta. HU-011–HU-015 suman 23 puntos, pero el resumen de EP-003 dice 21; recalcular el total global. |
| DOC-05 UX/UI | El sistema tiene panel web; el Word menciona Figma. | Añadir enlace/versión Figma si existe, mapa de navegación, estados, responsive/accesibilidad y evidencia de usabilidad. No afirmar pruebas no ejecutadas. |
| DOC-06 Arquitectura | `schema.sql`, rutas/servicios, ADR, resumen de arquitectura y catálogo API están versionados. | Añadir diagramas fuente completos, reglas centralizadas y OpenAPI o validar un contrato equivalente. No existen migraciones numeradas/reversibles. |
| DOC-07 Calidad | Hay 3 unitarias de sanitización, build Vite y workflow CI. | Falta plan con entrada/salida, pruebas API/autorización/integración/E2E, defectos, rendimiento y aceptación. El workflow de la rama documental aún debe ejecutarse en GitHub. |
| DOC-08 Manual técnico | README, `.env.example`, comandos, pruebas y runbook de respaldo en borrador. | Probar en ambiente limpio; validar despliegue, logs, monitoreo, rollback, respaldo/restauración y solución de fallos. El runbook no prueba una restauración real. |
| DOC-09 Manual usuario | `user-guide.md` creado como borrador basado en pantallas reales. | Validar con usuarios e instructor; agregar capturas contextualizadas y revisar permisos. |
| DOC-10 Cierre | El Word contiene revisión estática y pendientes. | No es informe de cierre: faltan aceptación, resultados consolidados, lecciones, versión/tag y paquete final. |

## Coherencia de requisitos con el código

| Función documentada | Estado real localizado | Ajuste recomendado |
|---|---|---|
| Roles | Enum y middleware: `admin`, `supervisor`, `operario`. | No llamar vendedor/almacenista roles sin aprobarlos en una matriz de permisos. |
| Producción | Crear/listar órdenes, cambiar estado y registrar avance; avance aumenta inventario terminado. | No hay edición general de orden ni consumo automático de materia prima. |
| Materias primas | CRUD y consulta de bajo stock. | Sin compras, consumo ni ledger de movimientos fechados. Marcar esas historias pendientes si siguen en alcance. |
| Inventario | Ingresos/salidas; producción aumenta y ventas descuentan. | No existe historial general de movimientos. Distinguir saldo agregado de trazabilidad. |
| Ventas | Admin/supervisor pueden registrar en API y descontar stock en transacción. | UI actual expone Ventas solo a admin; no hay comprobante ni Excel. Alinear API/UI/requisito con el cliente. |
| Reportes | Resúmenes de producción, ventas, inventario y auditoría. | Sin rendimiento por operario ni Excel; impresión depende del navegador. |
| Seguridad | JWT, bcryptjs y middleware por rol. | No se localizó recuperación ni bloqueo temporal; documentar CORS por ambiente antes del despliegue. |

## Inconsistencias y actualización del Word

1. La sección 36 dice que no se ejecutaron pruebas; está desactualizada. El 2026-10-20 se ejecutaron pruebas/build e instalación por lockfile; las evidencias locales no equivalen a producción ni aceptación.
2. La sección 37 afirma que no hay README, CHANGELOG, ADR, catálogo API ni pipeline. Eso quedó obsoleto al crear la rama `feature/MEVI-8-documentacion-adso`; actualizar el Word solo cuando esos cambios se integren a la rama que se presente como entrega.
3. La sección 35 cruza requisitos e historias; por ejemplo, asigna RF-004 Ventas a HU-005 de modificación de órdenes. Revisar cada relación con `requirements/traceability.md` y aprobarla con el equipo.
4. Identificar rama/commit exactos por revisión; no mezclar `develop` con una feature aún no integrada.
5. La fecha de cronograma finalizó 15/09/2026; conservarla como plan original y agregar un plan real aprobado, no inventar fechas.
6. Revisar puntos: EP-003 suma 23 según HU-011–HU-015, mientras que el resumen indica 21; recalcular el total general.
7. Las historias deben tener estado, responsable, prioridad, criterio verificable, método de prueba y evidencia antes de declararlas terminadas.

## Condiciones pendientes de aprobación

- Se generó la copia `MEVIPLAST_REVISADO_ADSO_2026-10-20.docx` con un anexo que supersede las conclusiones antiguas de las secciones 36–37; el original queda intacto fuera del repositorio.
- Los resultados de instalación, pruebas, auditoría y build se registran en `docs/evidence/EV-2026-10-20.md`; son ejecución local, no aceptación institucional.
- El manual `user-guide.md` es borrador y requiere recorrido de aceptación por perfil.
- La licencia depende de los titulares; no se seleccionó una licencia legalmente.
- La declaración de uso de IA requiere validación de que describa el uso real de todo el equipo.
- El informe no incorpora nombres, correos ni copia del Word original al repo para evitar publicar datos personales.
- CI prueba tests, auditorías y build, pero todavía debe ejecutarse en GitHub; no acredita lint o aceptación formal.

## Prioridad recomendada

1. Corregir requisitos, roles y trazabilidad con cliente/instructor.
2. Confirmar consumo/movimientos de materia prima y disponibilidad de Ventas para supervisor/vendedor.
3. Completar DOC-02, DOC-07 y DOC-09 con evidencias.
4. Ejecutar pruebas de permisos/integración y una restauración de backup supervisada.
5. Aprobar licencia, uso de IA, criterios de aceptación y DOC-10 antes de versionar entrega final.