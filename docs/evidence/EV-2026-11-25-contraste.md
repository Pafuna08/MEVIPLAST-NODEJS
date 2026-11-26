# Evidencia: contraste WCAG AA con el diseño nuevo (2026-11-25)

- Alcance: DEF-041, MEVI-121. Al actualizar la documentación tras el rediseño (PR #112 a #123) se volvió a medir el contraste de todo el panel y del sitio público, porque la medición anterior (EV-2026-11-10-01, 42 vistas, 0 fallas) se hizo con el diseño viejo y sin el sitio en React.
- Ambiente: Windows 11, Node.js 22.21.0, MariaDB 10.4.32 (XAMPP) y Microsoft Edge. Copia desechable `meviplast_capturas` de la base local con los datos de demostración de tres meses, API en el puerto 3995.
- Método: un script recorre las 25 vistas de los cinco roles (incluida «Mi perfil») y las 3 páginas públicas, en 1366 × 768 y en celular de 390 × 844 (56 vistas). En cada una mide el contraste de cada texto visible contra su fondo real con la fórmula de WCAG 2.1 (mínimo 4,5:1; 3:1 para texto grande) y revisa el desborde horizontal. Los textos sobre una imagen o un degradado no se pueden medir así y se cuentan aparte.
- Responsable: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-25-10 · DEF-041 · AC-003

| Hallazgo | Antes | Después |
| --- | --- | --- |
| Sitio público: «Ventajas competitivas» y «Contacto» (rojo sobre azul oscuro) | 3,57:1 y 2,85:1 | Rosa claro `#ff8a94`: 6,5:1 a 8,1:1 |
| Sitio público: números «01» a «04» de las ventajas | 3,04:1 | 6,9:1 |
| Tarjetas con aviso: «En el mínimo o por debajo» (Materias primas) y «Referencias en cero» (Inventario) | 4,46:1: el token `--warning` (`#a96908`) no llegaba a 4,5:1 sobre blanco | `--warning: #9a5f05`, 5,2:1 |

| Comprobación | Resultado |
| --- | --- |
| Medición de contraste antes del cambio | 56 vistas, 3 660 textos medidos (418 sobre imagen o degradado), 10 vistas con algún texto bajo el mínimo, 0 desbordes |
| Medición de contraste después del cambio | 56 vistas, 3 660 textos medidos, **0 textos bajo el mínimo**, 0 desbordes horizontales en el celular |
| Lint y build del frontend; lint del backend | Sin errores |
| Navegadores (`npm run test:browser`) | 63 de 63 flujos en Edge 158, Chrome 156 y Firefox 157 |
| `npm audit` | 0 vulnerabilidades en el backend y en el frontend |
| `git diff --check` | Sin errores |

El cambio es solo de estilos (CSS): no toca el servidor, así que las pruebas unitarias y E2E no cambian (164 y 24, medidas el mismo día con una cobertura de 79,0 % de líneas con unitarias y 91,6 % con E2E).
