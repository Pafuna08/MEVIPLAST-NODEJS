# Evidencia: documentación de la API con Swagger UI (2026-11-23)

- Ambiente: Windows 11, Node.js 22.21.0, MariaDB 10.4.32 (XAMPP), Edge 157 de Playwright.
- Código: rama `feature/MEVI-98-swagger-ui` sobre `develop` al PR #100 (`8f8d743`).
- Origen: pedido del instructor de documentar la API con Swagger (CR-024).
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-23-01 · CR-024 · CP-103

### Qué se agregó

| Dirección | Contenido |
| --- | --- |
| `/api-docs` | Swagger UI con el contrato `docs/api/openapi.json` (OpenAPI 3.0.3) |
| `/api-docs/openapi.json` | El mismo contrato en JSON, para importarlo en otras herramientas |

La lógica de la API no cambia: `app.js` solo monta la documentación, fuera de `/api`. Las peticiones de «Try it out» pasan por la API normal, con su token, sus roles y sus validaciones. `API_DOCS=off` desactiva la página.

### Pruebas automáticas

| Comprobación | Resultado | Comando |
| --- | --- | --- |
| Pruebas unitarias y de rutas | 138 de 138, en 31 archivos (4 nuevas en `api-docs.test.js`) | `npm test --prefix backend` |
| Pruebas E2E con MySQL | 24 de 24 | `npm run test:e2e --prefix backend` |
| Cobertura de las unitarias | 73,8 % de líneas; `apiDocs.js` 100 % | `npm run test:coverage --prefix backend` |
| Lint de backend y frontend | Sin errores | `npm run lint` |
| Build del frontend | Aprobado | `npm run build --prefix frontend` |
| `npm audit` | 0 vulnerabilidades en backend y frontend | `npm audit` |

### Prueba en el navegador (Edge, base local desechable)

| Comprobación | Resultado |
| --- | --- |
| `/api-docs` carga con el título «API MEVIPLAST 1.0.0» y sin el panel de errores del contrato | Correcto |
| Grupos: Sistema, Autenticación, Usuarios, Materias primas, Producción, Inventario, Ventas y Reportes | 8 grupos, 56 operaciones |
| «Try it out» en `GET /inventario` sin token | 401 |
| «Authorize» con el token del administrador y `GET /inventario` | 200 |
| «Authorize» con el token del vendedor y `GET /usuarios` | 403 «No tienes permisos para esta acción» |
| Errores de JavaScript en la página | 0 |

La base de la prueba fue una copia desechable de la base de demostración, borrada al terminar. No se registran tokens ni contraseñas en esta evidencia.
