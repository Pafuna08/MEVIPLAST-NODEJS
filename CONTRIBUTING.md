# Contribuir

## Ramas

- `main`: entregas estables.
- `develop`: integración del equipo.
- `feature/<id>-<tema>`: funcionalidades nuevas, con destino a `develop`.
- `fix/<tema>`: correcciones no urgentes, con destino a `develop`.
- `hotfix/<tema>`: correcciones críticas; acordar destino y back-merge antes de iniciar.

Mantén una necesidad coherente por rama. No hagas commits directamente en `main` o `develop`.

## Commits

Usa Conventional Commits en español o inglés:

- `feat(modulo): agregar una capacidad`
- `fix(auth): corregir validación`
- `docs(readme): documentar instalación`
- `test(api): cubrir permisos`
- `ci: validar build en pull request`

## Pull request

Abre el PR hacia `develop` e incluye objetivo, requisito relacionado (RF/HU), tipo de cambio, comandos de prueba y resultado, evidencia visual si aplica, riesgos, migraciones y checklist. No marques pruebas como ejecutadas si no se corrieron.

## Antes de solicitar revisión

```powershell
npm run lint --prefix backend
npm run lint --prefix frontend
npm test --prefix backend
npm audit --prefix backend --audit-level=critical
npm run build --prefix frontend
git diff --check
```

Actualiza README, CHANGELOG, contrato API y evidencia cuando el cambio los afecte. No subas `.env`, tokens, contraseñas, backups o datos reales de usuarios.
