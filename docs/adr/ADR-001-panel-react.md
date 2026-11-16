# ADR-001: unificar los dashboards con React

- Estado: Aceptado
- Fecha: 2026-10-19
- Trazabilidad: PR #10, migración React/Vite

## Contexto

Los perfiles tenían páginas HTML separadas y compartían módulos de dashboard. Se necesitaba una sola página de trabajo que seleccionara navegación y vistas según la sesión autenticada.

## Opciones

1. Mantener tres páginas HTML independientes.
2. Unificar el panel en React y conservar el sitio público/login estático.
3. Migrar también sitio público y login en el mismo cambio.

## Decisión

Usar React/Vite para un único `dashboard.html`; resolver el perfil desde la sesión y mantener inicialmente el sitio público y el login en HTML/CSS/JavaScript.

## Consecuencias

- Los perfiles comparten URL y componentes.
- Express sirve `frontend/dist` en ejecución compilada.
- Los permisos se siguen aplicando en la API; la navegación del cliente no es una frontera de seguridad.
- El sitio público y login no se consideran migrados a React.

## Actualización 2026-11-16 (DEF-028)

El instructor observó que el servidor publicaba toda la carpeta `frontend`: desde el navegador se podían abrir `login.js`, el código fuente de React (`/src/...`), `package.json`, `vite.config.js` y hasta `node_modules`. Se aplicó la opción 3: el sitio público, el inicio de sesión y la recuperación de cuenta pasaron a React (`frontend/src/paginas`) y forman una sola aplicación con el panel. Express publica solo `frontend/dist`.

- Se conservan las direcciones `/`, `/login.html`, `/recuperar.html` y `/dashboard.html`, porque los correos de recuperación y los marcadores apuntan a ellas; todas devuelven la misma página base y `main.jsx` carga la que corresponde.
- Cada página trae sus propios estilos; como pasar de una a otra recarga el navegador, los estilos del sitio público y los del panel no se mezclan.
- El código que llega al navegador es el compilado por Vite. Sigue siendo legible si alguien lo inspecciona (pasa en cualquier aplicación web), por eso los permisos y las validaciones siguen en la API.
