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

test("la recuperación de contraseña entrega el correo por SMTP con el enlace de un solo uso", async (t) => {
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
  const originalQuery = pool.query;
  pool.query = async (sql) => {
    if (sql.startsWith("SELECT id FROM usuarios")) return [[{ id: 4 }], []];
    return [{ affectedRows: 1 }, []];
  };
  t.after(() => {
    pool.query = originalQuery;
    process.env = entorno;
  });

  await authService.solicitarRecuperacion("operario@prueba.test");

  assert.ok(sesion.comandos.some((c) => c.startsWith("AUTH")), "se autentica en el servidor SMTP");
  assert.ok(sesion.comandos.includes("MAIL FROM:<mevi@prueba.test>"));
  assert.ok(sesion.comandos.includes("RCPT TO:<operario@prueba.test>"));
  // El asunto lleva "ñ", así que viaja codificado (RFC 2047)
  assert.match(sesion.mensaje, /^Subject: =\?UTF-8\?Q\?Restablece_tu_contrase=C3=B1a/m);
  // Quoted-printable parte las líneas largas del cuerpo con "=" al final
  const cuerpo = sesion.mensaje.replace(/=\r\n/g, "");
  assert.match(cuerpo, /http:\/\/localhost:3000\/recuperar\.html\?token=3D[a-f0-9]{64}/);
});
