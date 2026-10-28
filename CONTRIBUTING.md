# Contribuir

## Ramas

- `main`: entregas estables.
- `develop`: integración del equipo.
- `feature/<id>-<tema>`: funcionalidades nuevas, con destino a `develop`.
- `fix/<id>-<tema>`: correcciones no urgentes, con destino a `develop`.
- `docs/<id>-<tema>`: solo documentación, con destino a `develop`.
- `test/<id>-<tema>`: solo pruebas o evidencias de prueba, con destino a `develop`.
- `chore/<id>-<tema>`: mantenimiento (dependencias, lint, CI, licencia), con destino a `develop`.
- `hotfix/<id>-<tema>`: correcciones críticas; acordar destino y back-merge antes de iniciar.

`<id>` es el identificador de la tarea (`MEVI-##`) y `<tema>` va en minúsculas con guiones, por ejemplo `feature/MEVI-24-comprobante-venta`. Escribe el prefijo completo: `feature/`, no `feat/`.

Mantén una necesidad coherente por rama. No hagas commits directamente en `main` o `develop`.

## Commits

Usa Conventional Commits en español o inglés:

- `feat(modulo): agregar una capacidad`
- `fix(auth): corregir validación`
- `docs(readme): documentar instalación`
- `test(api): cubrir permisos`
- `ci: validar build en pull request`
- `chore(deps): actualizar dependencias`

El tipo del commit no tiene que coincidir con el prefijo de la rama: una rama `feature/` puede tener commits `feat`, `test` y `docs`.

## Pull request

Abre el PR hacia `develop` y escribe la descripción sobre la plantilla (`.github/pull_request_template.md`), con sus secciones: Objetivo, Trazabilidad (requisito RF/HU y tipo de cambio), Validación (comandos de prueba, resultado y evidencia visual si aplica) y Riesgos y operación (riesgos, migraciones y checklist). No marques pruebas como ejecutadas si no se corrieron; si una prueba se ejecutó solo en CI, indícalo.

## Antes de solicitar revisión

```powershell
npm run lint --prefix backend
npm run lint --prefix frontend
npm test --prefix backend
npm run test:e2e --prefix backend   # con MySQL activo; usa una base desechable
npm audit --prefix backend --audit-level=critical
npm run build --prefix frontend
git diff --check
```

Actualiza README, CHANGELOG, contrato API y evidencia cuando el cambio los afecte. No subas `.env`, tokens, contraseñas, backups o datos reales de usuarios.
