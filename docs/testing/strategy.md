# Estrategia y estado de pruebas

## Comandos

```powershell
npm test --prefix backend
npm audit --prefix backend --audit-level=critical
npm run build --prefix frontend
```

## Cobertura existente

- Unitarias: tres pruebas para sanitización de texto, números y objetos en `backend/tests/sanitize.test.js`.
- Build: Vite compila la entrada React `frontend/dashboard.html`.
- CI: ejecuta instalación por lockfile, auditoría a nivel crítico, tests backend y build.

## Cobertura pendiente

- Pruebas de integración de endpoints y permisos por rol.
- Pruebas E2E para altas, cambios y errores de formularios.
- Validación de rendimiento (<3 s) bajo carga acordada.
- Matriz de compatibilidad y usabilidad en Chrome, Edge y Firefox.
- Respaldo y restauración de base de datos comprobados.
- La auditoría todavía reporta vulnerabilidades altas transitivas en herramientas de desarrollo; revisar `SECURITY.md`.

Los resultados vigentes y su vínculo con la versión están en [`../evidence/EV-2026-10-19.md`](../evidence/EV-2026-10-19.md).