# Evidencia: tamaño del rollo en «Registrar material» (2026-11-25)

- Alcance: CR-027 (MEVI-115), pedido del usuario: «Registrar material» con Material, Tamaño del rollo, Unidad de medida (pulgadas o centímetros), Calibre, Color y Peso del rollo; el tamaño admite decimales y se aplican las reglas ya establecidas.
- Reglas: tamaño mayor que cero, hasta 2 decimales, hasta 200 pulgadas o 500 centímetros (se guarda «28 pulg» o «27.5 cm»; «27,50» y «27.5» son la misma bobina); material y color de sus listas; calibre con su formato (RN-025); peso del rollo como existencia inicial; una bobina por variante (409).
- Qué no cambia: la base de datos (el tamaño se guarda en la columna `medida`) y las bobinas ya registradas, que conservan su medida.
- Responsable: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-25-05 · Tamaño del rollo con unidad de medida

| Comprobación | Resultado |
| --- | --- |
| Lint y build del frontend; lint del backend | Sin errores |
| Pruebas unitarias (`npm test`) | 162 de 162, con CP-114 (`variantes.test.js`: decimales con punto o coma, topes por unidad, cero, texto y unidad no válida) |
| E2E con MySQL | 24 de 24 (tope de 201 pulgadas rechazado; bobina de 27,5 pulgadas creada como «27.5 pulg» y repetida con «27.50» → 409) |
| Navegadores | 60 de 60 flujos; «Crear nuevo material…» rechaza un tamaño de cero y crea la bobina de 61.5 pulgadas |
