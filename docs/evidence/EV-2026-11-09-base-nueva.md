# Evidencia de la inicialización de una base nueva (2026-11-09)

- Ambiente: Windows 11, Node.js 22.21.0, MariaDB 10.4.32 (XAMPP). Base desechable `meviplast_capturas`, creada para tomar las capturas de pantalla con datos limpios.
- Código: rama `fix/MEVI-68-db-init-sin-ubicacion`, sobre `develop` (`e566896`).
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-09-05 · DEF-020

| Paso | Resultado antes | Resultado después |
| --- | --- | --- |
| `DB_NAME=meviplast_capturas npm run db:init` sobre una base que no existe | Se detiene con «Unknown column 'ubicacion' in 'field list'» después de crear los usuarios | «Existencias DEMO cargadas», 12 migraciones registradas en `schema_migrations` y «Base de datos inicializada correctamente» |
| Existencias DEMO en `inventario` | No se cargan | 6 referencias (Adhesivo PP, Adhesivo Seguridad, Sencilla PP, Bolsas para la basura, Cargadera y Troquel riñón), con tildes guardadas en UTF-8 |
| Materias primas DEMO | Sin cantidades | 6 bobinas con cantidad, proveedor DEMO y stock mínimo |

**Causa:** `db:init` crea la base con el esquema final de `schema.sql` y después carga la semilla `sql/migrations/20261026_seed_demo_inventory.sql`. Esa semilla seguía escribiendo `inventario.ubicacion` («DEMO - Bodega A/B»), columna que se quitó con CR-015. Las bases que ya existían no se vieron afectadas: aplicaron la semilla antes de la migración que quita la columna. El CI no ejecuta `db:init`, por eso no lo detectó.

**Corrección:** la semilla solo inserta columnas que existen. Una prueba nueva en `tests/schema.test.js` compara cada columna que la semilla inserta o actualiza con `schema.sql`, y falla si alguna ya no existe (falló con `inventario.ubicacion` antes de la corrección).

## Regresión

| Comando | Resultado |
| --- | --- |
| `npm run lint` (backend) | Sin errores |
| `npm test --prefix backend` | 92 de 92 |
| `npm run test:e2e --prefix backend` | 17 de 17 |
| `npm run test:coverage` / `test:coverage:total` | 68,0 % / 84,7 % de líneas (79,6 % de ramas con E2E) |
| `git diff --check` | Sin errores |

La corrección no toca el panel, así que la prueba de navegadores sigue con el resultado de EV-2026-11-09-04 (42 de 42).
