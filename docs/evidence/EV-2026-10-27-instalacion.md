# Evidencia de instalación limpia (2026-10-27)

- Ambiente: Windows 11, Node.js 22.21.0, MariaDB 10.4.32 (XAMPP). Carpeta nueva fuera del proyecto, eliminada al terminar.
- Código: clon nuevo desde GitHub de `develop` en `7c28dcb`.
- Base: `meviplast_instalacion` (desechable, eliminada al terminar). Puerto 3994.
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-10-27-09 · PROD-04 / RNF-009: instalar siguiendo el README

Se siguieron los pasos del README en orden, sin usar nada de la carpeta de trabajo del equipo:

| Paso del README | Resultado |
| --- | --- |
| `Copy-Item .env.example backend/.env` y ajustar credenciales y `JWT_SECRET` | Correcto |
| `npm ci --prefix backend` y `npm ci --prefix frontend` | Correcto en 63 s; 0 vulnerabilidades |
| `npm run db:init --prefix backend` | Correcto, con el hallazgo DEF-014 |
| `npm start --prefix backend` | Correcto: `prestart` compila el panel y la API arranca |
| `GET /api/health` | `{"estado":"ok","baseDatos":"ok"}` |
| Login `admin` / `admin123` | Correcto |
| `/index.html`, `/login.html`, `/dashboard.html` | 200 |

Resultado: el README permite instalar y ejecutar el sistema sin pasos adicionales. No reemplaza la prueba de RNF-009, que exige que la haga una persona distinta al autor en otro equipo.

## Hallazgos corregidos

- **DEF-014:** `db:init` solo creaba cuentas de administrador, supervisor y operarios (faltaban vendedor y almacenista) y dejaba el inventario de producto terminado en cero, así que una instalación nueva no permitía probar ventas. Ahora crea una cuenta por rol y carga las existencias DEMO con `20261026_seed_demo_inventory.sql`, que solo completa filas DEMO vacías e inserta variantes faltantes. Verificado en una base desechable: 5 roles, 6 variantes con 6 050 unidades y 6 bobinas con 385 kg; la segunda ejecución no duplica datos.
- **DEF-015:** `initDb.js` buscaba las migraciones en `../../../sql/migrations` (una carpeta que no existe), así que `DB_APPLY_MIGRATIONS=true` no aplicaba nada ni mostraba aviso. Con la ruta corregida, sin las variables avisa que hay migraciones pendientes; con ellas aplicó las 9 migraciones en orden sobre una base desechable y la segunda ejecución no repitió ninguna.

## Observación durante la prueba

El disco C: se quedó sin espacio durante el primer intento (0 MB libres). Con autorización del usuario se borraron los navegadores de prueba de Playwright y la caché de npm, y la instalación se repitió en el disco J:, con la caché de npm dentro de la carpeta de prueba. Para repetir `npm run test:browser` hay que reinstalar los navegadores (`npx playwright-core install chromium firefox`, unos 1,1 GB).
