const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Los mensajes de la API se muestran tal cual en la pantalla: deben llevar sus tildes y su ñ.
// El login decía «Usuario o contrasena incorrectos».
const SIN_TILDE = /\b(contrasena|produccion|sesion|invalid[oa]|numero|operacion|informacion|codigo|electronico|transaccion|descripcion|categoria|auditoria|accion|tambien|todavia|despues|segun)\b/i;
const MENSAJE = /(?:mensaje:\s*|new Error\(\s*|const MENSAJE_\w+\s*=\s*|\|\|\s*)(["'`])((?:(?!\1).)*)\1/g;

function archivos(carpeta) {
  return fs.readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = path.join(carpeta, entrada.name);
    return entrada.isDirectory() ? archivos(ruta) : ruta.endsWith(".js") ? [ruta] : [];
  });
}

test("los mensajes que la API muestra al usuario llevan tildes y ñ", () => {
  const malos = [];
  for (const archivo of archivos(path.join(__dirname, "..", "src"))) {
    fs.readFileSync(archivo, "utf8")
      .split(/\r?\n/)
      .forEach((linea, i) => {
        for (const [, , texto] of linea.matchAll(MENSAJE)) {
          if (SIN_TILDE.test(texto)) malos.push(`${path.relative(path.join(__dirname, ".."), archivo)}:${i + 1} «${texto}»`);
        }
      });
  }
  assert.deepEqual(malos, []);
});
