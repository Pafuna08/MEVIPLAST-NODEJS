# Evidencia de instalación limpia (2026-11-08)

- Ambiente: Windows 11, Node.js 22.21.0, npm 10.9.4, MariaDB 10.4.32 (XAMPP). Carpeta nueva fuera del proyecto, eliminada al terminar.
- Código: clon nuevo desde GitHub de `develop` en `4bb3c70` (PR #1 a #52).
- Base: `meviplast_e2e_instalacion` (desechable, eliminada al terminar). Puerto 3992. `meviplast_db` no se tocó.
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-08-01 · PROD-04 / RNF-009: instalar siguiendo el README

Se siguieron los pasos del README en orden, sin usar nada de la carpeta de trabajo del equipo:

| Paso | Resultado |
| --- | --- |
| `Copy-Item .env.example backend/.env` y ajustar credenciales y `JWT_SECRET` | Correcto |
| `npm ci --prefix backend` y `npm ci --prefix frontend` | Correcto |
| `npm run db:init --prefix backend` con MySQL apagado | Falla sin explicar la causa (DEF-016) |
| `npm run db:init --prefix backend` con MySQL encendido | Correcto, con un aviso confuso (DEF-017) |
| `npm start --prefix backend` | Correcto: `prestart` compila el panel y la API arranca |
| `GET /api/health` | `{"estado":"ok","baseDatos":"ok"}` |
| `/index.html`, `/login.html`, `/dashboard.html` | 200 |
| Login de las 5 cuentas de demostración (una por rol) | 200 en las 5 |
| `npm run lint` en backend y frontend | Sin errores |
| `npm test` (backend) | 72 de 72 aprobadas |
| `npm run build` (frontend) | Correcto |
| `npm run test:e2e` (backend) | 14 de 14 aprobadas |
| `npm audit` en backend y frontend | 3 vulnerabilidades moderadas en dependencias de desarrollo (ver abajo); ninguna crítica, así que el control del CI (`--audit-level=critical`) pasa |

Resultado: el README permite instalar, probar y ejecutar el sistema sin pasos adicionales. Esta prueba la hizo el autor; RNF-009 sigue **parcial** hasta que Carlos Herrera Sibaja la repita en su equipo (rama `docs/MEVI-48-instalacion-limpia-carlos`).

Actualización: Carlos Herrera Sibaja repitió la instalación en su equipo el mismo día, sin hallazgos (EV-2026-11-08-05). RNF-009 cumple.

## Hallazgos corregidos (rama `fix/MEVI-51-instalacion-limpia`)

- **DEF-016:** con MySQL apagado, `db:init` mostraba `Error al inicializar la base de datos:` sin texto, porque `mysql2` lanza un `AggregateError` con el mensaje vacío. Ahora explica la causa: «No se pudo conectar a MySQL en localhost:3306. Inicia MySQL (por ejemplo desde el panel de XAMPP) y revisa DB_HOST y DB_PORT en backend/.env.» También da un mensaje propio si el servidor no existe o si el usuario o la contraseña son incorrectos, sin mostrar la contraseña.
- **DEF-017:** en una base nueva, `db:init` avisaba «Migraciones pendientes omitidas», aunque `schema.sql` ya incluye el esquema final y no hay nada que aplicar. Ahora, si la base no existía, registra las migraciones como aplicadas en `schema_migrations` y lo informa; en una base existente lista solo las migraciones que faltan, o dice «Sin migraciones pendientes».

Verificación de la corrección sobre la base desechable `meviplast_e2e_instalacion`, eliminada al terminar:

| Caso | Salida |
| --- | --- |
| Base nueva | «Base nueva: schema.sql ya incluye las 11 migraciones; quedaron registradas en schema_migrations.» |
| Segunda ejecución | «Sin migraciones pendientes.» |
| Puerto sin MySQL (`DB_PORT=3999`) | «No se pudo conectar a MySQL en localhost:3999 …», código de salida 1 |

Pruebas unitarias nuevas en `tests/schema.test.js`: el mensaje para MySQL apagado, usuario rechazado y otros errores, y el cálculo de migraciones pendientes.

El README ahora lista las cinco cuentas de demostración con su contraseña (antes había que buscarlas en `initDb.js`) y avisa que hay que encender MySQL antes de `db:init`.

## Pendiente

- Las 3 vulnerabilidades moderadas de `npm audit` (`minimatch`, que llega por `nodemon` en el backend, y `vite` en el frontend) son de herramientas de desarrollo y no se instalan en producción (`npm audit --omit=dev` da 0). Corregidas en la rama `chore/MEVI-52-npm-audit`: `vite` 6.4.5 y `minimatch` 11.0.5 para `nodemon` (con un `override`); `npm audit` da 0 en ambos y `nodemon` sigue reiniciando al detectar cambios.
- Repetición por Carlos Herrera Sibaja en su equipo para cerrar RNF-009.
