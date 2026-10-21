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
