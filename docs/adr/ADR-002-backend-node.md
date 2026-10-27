# ADR-002: construir el backend con Node.js y Express en lugar de Django

- Estado: Aceptado
- Fecha de la decisión: entre junio y agosto de 2026, antes del commit inicial del 2026-08-04; registrada el 2026-10-27
- Trazabilidad: CR-001, RSD-01, commit `9173119` (estructura base en Node.js)

## Contexto

El acta de constitución v1.0 (mayo de 2026) planeaba el backend en Python con Django y el frontend en HTML, CSS y JavaScript. Al iniciar la construcción, el instructor recomendó usar Node.js y el equipo identificó que domina más JavaScript que Python. Con Django, el equipo habría trabajado en dos lenguajes y con un framework menos conocido, dentro del tiempo del cronograma académico.

## Opciones

1. Mantener Python con Django, como decía el acta.
2. Usar Node.js con Express en el backend, de modo que todo el proyecto quede en JavaScript.

## Decisión

Usar Node.js con Express y MySQL para el backend, siguiendo la recomendación del instructor y aprovechando que el equipo domina JavaScript. El repositorio se creó directamente con esta tecnología.

## Consecuencias

- Todo el producto usa un solo lenguaje: el backend en Express, el panel en React con Vite (ADR-001) y el sitio público en JavaScript.
- No se cuenta con el panel de administración ni el ORM que trae Django: las validaciones, las consultas SQL parametrizadas y las migraciones se escriben a mano (`backend/src/services`, `backend/sql/migrations`).
- Las restricciones tecnológicas y el cronograma del acta v1.0 quedaron desactualizados. Se corrigieron en la Formulación y Constitución (MEV-DOC-01) como el cambio CR-001.
