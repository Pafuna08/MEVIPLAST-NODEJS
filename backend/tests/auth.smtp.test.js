const test = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const { once } = require("node:events");

const { pool } = require("../src/config/database");
const authService = require("../src/services/auth.service");

// Servidor SMTP mínimo en 127.0.0.1: registra los comandos y el mensaje recibido.
async function servidorSmtp(t) {
  const sesion = { comandos: [], mensaje: "" };
  const servidor = net.createServer((socket) => {
    let enDatos = false;
    let pendiente = "";
    socket.write("220 smtp-prueba listo\r\n");
    socket.on("data", (trozo) => {
      pendiente += trozo.toString("utf8");
      let fin;
      while ((fin = pendiente.indexOf("\r\n")) >= 0) {
        const linea = pendiente.slice(0, fin);
        pendiente = pendiente.slice(fin + 2);
        if (enDatos) {
          if (linea === ".") {
            enDatos = false;
            socket.write("250 mensaje recibido\r\n");
          } else {
            sesion.mensaje += `${linea}\r\n`;
          }
          continue;
        }
        sesion.comandos.push(linea);
        const comando = linea.split(" ")[0].toUpperCase();
        if (comando === "EHLO") socket.write("250-smtp-prueba\r\n250 AUTH PLAIN LOGIN\r\n");
        else if (comando === "AUTH") socket.write("235 autenticado\r\n");
        else if (comando === "DATA") { enDatos = true; socket.write("354 enviar datos\r\n"); }
        else if (comando === "QUIT") { socket.write("221 adios\r\n"); socket.end(); }
        else socket.write("250 ok\r\n");
      }
    });
  });
  servidor.listen(0, "127.0.0.1");
  await once(servidor, "listening");
  t.after(() => new Promise((resolve) => servidor.close(resolve)));
  return { puerto: servidor.address().port, sesion };
}

// Auditoría de seguridad (run-1): con SMTP_SECURE=false el transporte exige STARTTLS (requireTLS). Un
// servidor que no lo ofrece (o una respuesta EHLO alterada en el camino) hace fallar el envío: la clave SMTP
// y el enlace con el token nunca viajan sin cifrar, y el token que no se pudo enviar se borra.
test("sin STARTTLS el correo de recuperación no se envía: ni AUTH ni token en texto plano", async (t) => {
  const { puerto, sesion } = await servidorSmtp(t);
  const entorno = { ...process.env };
  Object.assign(process.env, {
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(puerto),
    SMTP_SECURE: "false",
    SMTP_USER: "mevi@prueba.test",
    SMTP_PASSWORD: "clave-smtp-prueba",
    SMTP_FROM: "MEVIPLAST <mevi@prueba.test>",
    FRONTEND_URL: "http://localhost:3000",
  });
  const consultas = [];
  const originalQuery = pool.query;
  pool.query = async (sql, params) => {
    consultas.push([sql, params]);
    if (sql.startsWith("SELECT id, correo FROM usuarios")) return [[{ id: 4, correo: "operario@prueba.test" }], []];
    return [{ affectedRows: 1 }, []];
  };
  t.after(() => {
    pool.query = originalQuery;
    process.env = entorno;
  });

  await assert.rejects(authService.solicitarRecuperacion("operario@prueba.test"));

  assert.equal(sesion.comandos.some((c) => c.startsWith("AUTH")), false, "no se autentica sin TLS");
  assert.equal(sesion.mensaje, "", "no se envía el mensaje con el token");
  assert.ok(consultas.some(([sql]) => sql.startsWith("DELETE FROM tokens_recuperacion WHERE usuario_id = ? AND token_hash = ?")), "se borra el token que no se envió");
});
