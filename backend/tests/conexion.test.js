const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { datosConexion, opcionesSsl, zonaHoraria } = require("../src/config/conexion");

const VARIABLES = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_SSL", "DB_SSL_CA", "DB_SSL_CA_FILE", "DB_TIME_ZONE"];

function conEntorno(t, valores) {
  const antes = Object.fromEntries(VARIABLES.map((clave) => [clave, process.env[clave]]));
  for (const clave of VARIABLES) delete process.env[clave];
  Object.assign(process.env, valores);
  t.after(() => {
    for (const [clave, valor] of Object.entries(antes)) {
      if (valor === undefined) delete process.env[clave];
      else process.env[clave] = valor;
    }
  });
}

test("en local la conexión no usa SSL y toma los valores de siempre", (t) => {
  conEntorno(t, {});
  assert.deepEqual(datosConexion(), { host: "localhost", port: 3306, user: "root", password: "" });
  assert.equal(opcionesSsl(), undefined);
  assert.equal(zonaHoraria(), null);
});

test("en la nube la conexión va cifrada con el certificado de la variable (saltos de línea como \\n)", (t) => {
  conEntorno(t, { DB_HOST: "mysql.ejemplo.com", DB_PORT: "12345", DB_USER: "avnadmin", DB_PASSWORD: "secreta", DB_SSL: "TRUE", DB_SSL_CA: "-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----" });
  const datos = datosConexion();
  assert.equal(datos.port, 12345);
  assert.equal(datos.ssl.rejectUnauthorized, true, "se verifica el certificado del servidor");
  assert.equal(datos.ssl.minVersion, "TLSv1.2");
  assert.equal(datos.ssl.ca, "-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----");
});

test("los valores pegados con espacios o saltos de línea al final se limpian", (t) => {
  conEntorno(t, { DB_HOST: "mysql.ejemplo.com\n", DB_PORT: " 12345\r\n", DB_USER: "avnadmin\n", DB_PASSWORD: "secreta\n", DB_SSL: "true", DB_SSL_CA: "-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----\n" });
  const datos = datosConexion();
  assert.deepEqual([datos.host, datos.port, datos.user, datos.password], ["mysql.ejemplo.com", 12345, "avnadmin", "secreta"]);
  assert.equal(datos.ssl.ca, "-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----");
});

test("el certificado también se puede leer de un archivo", (t) => {
  const archivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "meviplast-ca-")), "ca.pem");
  fs.writeFileSync(archivo, "PEM DE PRUEBA");
  t.after(() => fs.rmSync(path.dirname(archivo), { recursive: true, force: true }));
  conEntorno(t, { DB_SSL: "true", DB_SSL_CA_FILE: archivo });
  assert.equal(opcionesSsl().ca, "PEM DE PRUEBA");
});

test("la zona horaria se valida antes de usarla en SQL", (t) => {
  conEntorno(t, { DB_TIME_ZONE: "-05:00" });
  assert.equal(zonaHoraria(), "-05:00");
  for (const mala of ["America/Bogota", "-5", "-05:00'; DROP TABLE ventas; --", "+15:00"]) {
    process.env.DB_TIME_ZONE = mala;
    assert.throws(() => zonaHoraria(), /±HH:MM/, mala);
  }
});
