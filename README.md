# MEVIPLAST — Sistema Web (Landing Page + Backend por capas)

Este proyecto retoma la landing page y los dashboards ya construidos en el
repositorio original (`Pafuna08/MEVIPLAST`) y les agrega una arquitectura
por capas en Node.js + Express + MySQL, siguiendo el mismo patrón de
carpetas usado en otros proyectos (`public/` como vista y `src/` dividido
en `config`, `controllers`, `routes`, `services`).

## Estructura del proyecto

```
meviplast/
├── public/                      (vista — se sirve como estático)
│   ├── assets/
│   ├── css/
│   ├── js/
│   │   ├── login.js              (ahora consume /api/auth/login)
│   │   ├── dashboard.js          (valida token JWT + helper apiFetch)
│   │   └── script.js
│   ├── index.html
│   ├── login.html
│   ├── dashboard-admin.html
│   ├── dashboard-operario.html
│   └── dashboard-supervisor.html
├── src/
│   ├── config/
│   │   ├── database.js           (pool de conexión MySQL)
│   │   └── initDb.js             (crea BD + siembra usuarios demo)
│   ├── middlewares/
│   │   └── auth.middleware.js    (verificarToken, verificarRol)
│   ├── controllers/              (reciben req/res, delegan al service)
│   ├── services/                 (lógica de negocio + acceso a datos)
│   ├── routes/                   (definición de endpoints REST)
│   ├── utils/
│   │   └── auditoria.js          (bitácora reutilizable, EP-004)
│   └── app.js                    (configuración global de Express)
├── sql/
│   └── schema.sql                (esquema completo de la BD)
├── package.json
├── server.js                     (arranque del servidor)
├── .env.example
└── .gitignore
```

## Cómo se mapean las 5 épicas a la estructura

| Épica  | Módulo                  | Archivos principales                                                |
|--------|--------------------------|-----------------------------------------------------------------------|
| EP-001 | Producción                | `controllers/produccion.*`, `services/produccion.*`, `routes/produccion.routes.js` |
| EP-002 | Materia Prima              | `controllers/materiaPrima.*`, `services/materiaPrima.*`, `routes/materiaPrima.routes.js` |
| EP-003 | Inventario / Ventas        | `controllers/inventario.*`, `controllers/ventas.*` y sus services/routes |
| EP-004 | Seguridad                  | `services/auth.service.js`, `controllers/usuarios.*`, `middlewares/auth.middleware.js`, `utils/auditoria.js` |
| EP-005 | Reportes                   | `controllers/reportes.*`, `services/reportes.*` (agrega datos de los demás módulos) |

Cada módulo sigue el mismo flujo: **routes → controller → service → MySQL**,
y los services registran automáticamente en la tabla `auditoria` (bitácora)
las acciones sensibles (crear, actualizar, eliminar, login), cubriendo el
componente de trazabilidad de EP-004 que ya tenías en tus diagramas BPMN.

## Puesta en marcha

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Crear el archivo `.env` a partir de `.env.example` y ajustar credenciales
   de MySQL y el `JWT_SECRET`.
3. Crear la base de datos y los usuarios demo (admin/supervisor/operario,
   con las mismas credenciales que hoy tienes en el login de prueba, pero
   ahora con contraseña cifrada en MySQL):
   ```bash
   npm run db:init
   ```
4. Levantar el servidor:
   ```bash
   npm run dev    # con recarga automática (nodemon)
   # o
   npm start
   ```
5. Abrir `http://localhost:3000` — la landing, el login y los 3 dashboards
   se sirven como estáticos, y todo el backend queda disponible bajo
   `/api/...` (por ejemplo `/api/auth/login`, `/api/produccion`,
   `/api/materia-prima`, `/api/inventario`, `/api/ventas`, `/api/reportes/*`).

## Qué cambió respecto al repositorio original

- El login ya no valida usuarios "quemados" en `login.js`: ahora llama a
  `POST /api/auth/login`, que consulta MySQL y devuelve un JWT.
- `dashboard.js` valida que exista un token válido además de la sesión, y
  trae un helper `apiFetch()` listo para que conectes cada dashboard a sus
  endpoints (tablas de producción, materia prima, inventario, ventas).
- El resto de la landing page (`index.html`, estilos, imágenes) se copió
  igual, sin cambios, para no perder el trabajo visual ya hecho.

## Próximos pasos sugeridos

- Conectar las tablas/listas de cada `dashboard-*.html` a sus endpoints
  reales usando `apiFetch()` (hoy los botones muestran un toast de
  "demo sin backend").
- Agregar validaciones más finas por rol dentro de cada dashboard (por
  ejemplo, que el operario solo vea sus propias órdenes de producción).
- Escribir pruebas para los `services`, que son los que concentran la
  lógica de negocio.
