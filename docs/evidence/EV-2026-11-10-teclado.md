# Evidencia de uso solo con teclado (2026-11-10)

- Ambiente: Windows 11, Node.js 22.21.0, MariaDB 10.4.32 (XAMPP), Chromium, Edge y Firefox de Playwright. Base desechable `meviplast_afinado` en el puerto 3005, con los datos DEMO.
- Código: rama `fix/MEVI-76-uso-con-teclado`, sobre `develop` (`8d5ced4`).
- Método: un script usa solo el teclado (Tab, Mayús+Tab, Enter, flechas y Esc). Inicia sesión con cada uno de los cinco roles, recorre con Tab las 21 vistas y cuenta cuántos elementos interactivos alcanza y si cada uno muestra el foco, entra al menú con Enter, abre la ventana de cierre de sesión y, con el vendedor, registra una venta completa hasta el comprobante.
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-10-02 · RNF-012 · DEF-025

| Comprobación | Antes | Después |
| --- | --- | --- |
| Iniciar sesión con Tab y Enter (5 roles) | Correcto | Correcto |
| Elementos alcanzados con Tab en las 21 vistas | Todos | Todos |
| Foco visible en cada elemento | Sí (contorno del navegador) | Sí |
| Menú lateral con Enter | Correcto | Correcto |
| Ventanas de confirmación y comprobante: el foco entra al abrir | En 3 de 5 (las que tenían `autoFocus`); no en eliminar usuario ni en el comprobante | En las 5 |
| Tab y Mayús+Tab dentro de la ventana | El foco se iba a la página de atrás (11 de 12 pulsaciones) | El foco circula dentro de la ventana |
| Esc | No cerraba la ventana | La cierra, igual que el clic fuera |
| Al cerrar la ventana | El foco quedaba al inicio de la página | Vuelve al botón que la abrió |
| Venta completa con teclado (línea → referencia → formulario → confirmar → comprobante → Esc) | Se trababa en la confirmación | Completa |

DEF-025: las ventanas de confirmación no se podían manejar solo con teclado. Corrección: un componente común `Dialogo` para las cinco ventanas (eliminar usuario, confirmar registro, cerrar sesión, cancelar orden y comprobante de venta).

Con esto RNF-012 queda verificado en lo que el equipo puede medir: contraste WCAG AA (EV-2026-11-10-01), campos con etiqueta y uso completo con teclado. Falta probarlo con un lector de pantalla y con usuarios de MEVIPLAST.

## Regresión

| Comando | Resultado |
| --- | --- |
| `npm run lint --prefix frontend` | Sin errores |
| `npm run build --prefix frontend` | Correcto |
| `npm run test:browser --prefix backend` | 45 de 45 flujos (15 por navegador); el flujo nuevo de teclado falló en los tres navegadores antes de la corrección |
| `git diff --check` | Sin errores |

El cambio es solo del panel, así que las pruebas unitarias y E2E no cambian (110 y 20).
