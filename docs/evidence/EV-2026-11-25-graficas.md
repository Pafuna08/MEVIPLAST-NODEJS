# Evidencia: gráficas por referencias con su detalle (2026-11-25)

- Alcance: MEVI-120, pedido del usuario: que las barras de «Producción por línea» y de los reportes, y las del rendimiento por operario, tengan varios colores según las referencias que las componen, y que al tocar una barra se abra una ventana con los números exactos y el porcentaje de cada variante.
- Qué cambia:
  - componente `StackedBarList` (`frontend/src/comun/BarrasApiladas.jsx`): barras divididas por partes con 2 px de separación, botón por barra y ventana de detalle (barra grande y tabla con color, cantidad, % del total y columnas extra);
  - Inicio («Producción por línea»), reporte de producción («Unidades por línea») y de ventas («Total vendido por línea»): cada línea dividida por sus variantes;
  - reporte de rendimiento: gráfica nueva «Producción por operario», dividida por referencia, con leyenda; el detalle trae órdenes, meta y cumplimiento de cada referencia;
  - `GET /api/reportes/rendimiento`: cada operario trae `referencias` (mismas órdenes del cumplimiento: del periodo y sin las canceladas; lo producido no supera la meta).
- Colores: paleta categórica de la guía de visualización, en orden fijo. El validador (`validate_palette.js`, modo claro, fondo blanco) dio PASS en franja de luminosidad, croma, separación para daltonismo (peor par vecino ΔE 11,8) y visión normal (ΔE 20,5); cuatro colores quedan bajo 3:1 de contraste, por eso las cifras exactas siempre están en la ventana de detalle y en las tablas. Más de siete referencias se agrupan en «Otras referencias» (gris).
- Responsable: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-25-09 · Gráficas por referencias

| Comprobación | Resultado |
| --- | --- |
| Lint y build del frontend; lint del backend | Sin errores |
| Pruebas unitarias (`npm test`) | 164 de 164; CP-117 en `reportes.service.test.js`: las referencias de cada operario con su meta, producido y cumplimiento, sin canceladas y sin pasar la meta |
| Navegadores | 63 de 63 flujos; en «Supervisor: rendimiento de operarios» la barra del operario abre el detalle con sus referencias y Esc lo cierra |
| Revisión visual | Inicio y reportes de producción y rendimiento, con la ventana de detalle, en escritorio (1366 px) y celular (390 px) |
