# Evidencia de instalación limpia por Carlos Herrera Sibaja (2026-11-08)

- Ambiente: equipo de Carlos Herrera Sibaja, Windows 11 Home Single Language 10.0.26300, Node.js 22.21.0, npm 10.9.4, Git 2.51.1, MariaDB 10.4.32 (XAMPP). Carpeta nueva fuera de la copia de trabajo del proyecto, eliminada al terminar.
- Código: clon nuevo desde GitHub de `develop` en `62ed8d3` (PR #1 a #57).
- Base: `meviplast_e2e_instalacion_carlos` (desechable, eliminada al terminar). Puerto 3995. Las bases existentes del equipo no se tocaron.
- Responsable de la ejecución: Carlos Herrera Sibaja, con asistencia de IA.

## EV-2026-11-08-05 · PROD-04 / RNF-009 / CP-063: instalar siguiendo el README

Se siguió la sección «Instalación local» del README en orden, sin usar nada de la copia de trabajo. Las únicas variaciones fueron los valores de `backend/.env`: `DB_NAME=meviplast_e2e_instalacion_carlos`, `PORT=3995`, un `JWT_SECRET` aleatorio y las credenciales del MySQL local.

| Paso | Resultado |
| --- | --- |
| Requisitos previos: Node.js ≥ 20, npm, Git y MySQL encendido | Correcto |
| `git clone` y `git checkout develop` | Correcto, commit `62ed8d3` |
| Copiar `.env.example` a `backend/.env` y ajustar los valores | Correcto; `backend/.env` no aparece en `git status` |
| `npm ci --prefix backend` y `npm ci --prefix frontend` | Correcto en 15 s; 0 vulnerabilidades |
| `npm run db:init --prefix backend` | Correcto: 5 cuentas (una por rol), existencias DEMO y «Base nueva: schema.sql ya incluye las 11 migraciones» |
| `npm start --prefix backend` | Correcto: `prestart` compila el panel (Vite 6.4.5) y la API arranca en el puerto 3995 |
| `GET /api/health` | `{"estado":"ok","baseDatos":"ok"}` |
| `/index.html`, `/login.html`, `/dashboard.html` | 200 |
| Login de las 5 cuentas de demostración del README | 200 en las 5, cada una con su rol |
| `npm run lint` en backend y frontend | Sin errores |
| `npm test --prefix backend` | 77 de 77 aprobadas |
| `npm run build --prefix frontend` | Correcto |
| `npm run test:e2e --prefix backend` | 15 de 15 aprobadas; la base `meviplast_e2e` se creó y se eliminó sola |
| `npm audit` en backend y frontend | 0 vulnerabilidades (también con `--audit-level=critical`) |

## Hallazgos

Sin hallazgos: el README bastó para instalar, probar y ejecutar el sistema.

## Conclusión

RNF-009 cumple: instalado por una persona distinta al autor.
