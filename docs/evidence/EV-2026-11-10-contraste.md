# Evidencia de contraste, avisos y uso en celular (2026-11-10)

- Ambiente: Windows 11, Node.js 22.21.0, MariaDB 10.4.32 (XAMPP), Chromium de Playwright. Base desechable `meviplast_afinado` en el puerto 3005, con los datos DEMO y una segunda referencia de Adhesivo PP.
- Código: rama `fix/MEVI-74-contraste-y-avisos`, sobre `develop` (`d7e2835`).
- Método: un script recorre las 21 vistas de los cinco roles en 1366 × 768 y en 390 × 844 (celular). En cada una mide el contraste de cada texto contra su fondo real con la fórmula de WCAG 2.1 (mínimo 4,5:1; 3:1 para texto grande), y revisa el desborde horizontal, los campos sin etiqueta, los botones sin nombre, los controles de menos de 24 px en celular y los errores de la consola.
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-10-01 · ACC-001 · AC-003 · DEF-024

| Hallazgo | Antes | Después |
| --- | --- | --- |
| Botones rojos con texto blanco («Guardar», «Ver reportes», «Eliminar») | 4,17:1 con `#e63946` | 5,12:1 con `#d02c3a` |
| Texto rojo «Ver existencias» sobre blanco | 4,17:1 | 5,12:1 |
| Texto gris de las descripciones sobre el fondo gris claro | 4,18:1 con `#667588` | 4,62:1 con `#5f6e81` |
| Encabezados de tabla y etiquetas del resumen de venta | 4,49:1 | 4,97:1 |
| Iniciales del avatar sobre azul marino | 3,37:1: la regla `.user-menu span` también pintaba de gris el avatar | 15,9:1 (blanco) |
| Aviso vacío en la esquina inferior derecha (DEF-024) | Asomaba 12 px en todas las pantallas, también en las capturas de los manuales | Oculto hasta que hay un mensaje |
| Enlaces del inicio de sesión en celular | Menos de 24 px de alto | 24 px o más (WCAG 2.5.8) |

Resultado final: 42 vistas revisadas, **0 combinaciones con contraste insuficiente**, sin desborde horizontal en celular, todos los campos con etiqueta, todos los botones con nombre y sin errores en la consola. El cambio de color se aplica igual en el panel, el inicio de sesión y el sitio público.

## Regresión

| Comando | Resultado |
| --- | --- |
| `npm run lint --prefix frontend` | Sin errores |
| `npm run build --prefix frontend` | Correcto |
| `npm run test:browser --prefix backend` | 42 de 42 flujos en Edge, Chrome y Firefox |
| `git diff --check` | Sin errores |

El cambio es solo de estilos (CSS): no toca el servidor, así que las pruebas unitarias y E2E no cambian (110 y 20).
