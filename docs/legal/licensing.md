# Licencia del producto

- Decisión: licencia propietaria, todos los derechos reservados.
- Titulares: Pablo E. Fuenmayor Osuna y Carlos Herrera Sibaja.
- Fecha de la decisión: 2026-10-27.
- Texto vigente: [`../../LICENSE`](../../LICENSE).

El repositorio no es software de código abierto. El SENA puede ejecutarlo y revisarlo para evaluar el proyecto; cualquier otro uso, incluido el de MEVIPLAST, requiere un acuerdo escrito con los autores. Los `package.json` declaran `"license": "UNLICENSED"`, la convención de npm para software no publicado bajo una licencia abierta.

## Dependencias de terceros

Las licencias de las dependencias son permisivas y compatibles con el uso propietario. Sus textos se conservan en cada paquete dentro de `node_modules`.

| Dependencia | Versión | Licencia |
| --- | --- | --- |
| express | 4.22.3 | MIT |
| bcryptjs | 2.4.3 | MIT |
| jsonwebtoken | 9.0.3 | MIT |
| mysql2 | 3.23.2 | MIT |
| nodemailer | 10.2.1 | MIT-0 |
| cors | 2.8.6 | MIT |
| dotenv | 16.6.1 | BSD-2-Clause |
| exceljs | 4.4.0 | MIT |
| uuid (de exceljs, forzada con `overrides`) | 11.1.1 | MIT |
| react, react-dom | 19.3.1 | MIT |
| vite (desarrollo) | 6.4.4 | MIT |
| nodemon (desarrollo) | 3.1.14 | MIT |

Al agregar o actualizar una dependencia, verifica su licencia y actualiza esta tabla.
