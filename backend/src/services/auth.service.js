const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");
require("dotenv").config();

const RESPUESTA_RECUPERACION =
  "Si existe una cuenta asociada a ese correo, recibirás un mensaje con los siguientes pasos.";
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function crearTransportadorCorreo() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    const error = new Error("El servicio de correo no está configurado");
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

function crearEnlaceRecuperacion(token) {
  const baseUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  return `${baseUrl}/recuperar.html?token=${token}`;
}

function validarCorreo(correo) {
  const normalizado = String(correo || "").trim().toLowerCase();
  if (normalizado.length > 254 || !FORMATO_CORREO.test(normalizado)) {
    const error = new Error("Ingresa un correo electrónico válido");
    error.status = 400;
    throw error;
  }
  return normalizado;
}

async function solicitarRecuperacion(correo) {
  const email = validarCorreo(correo);
  const transportador = crearTransportadorCorreo();
  const [usuarios] = await pool.query(
    "SELECT id FROM usuarios WHERE correo = ? AND activo = 1",
    [email],
  );
  if (!usuarios.length) return RESPUESTA_RECUPERACION;
  const usuario = usuarios[0];
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const enlace = crearEnlaceRecuperacion(token);
  await pool.query("DELETE FROM tokens_recuperacion WHERE usuario_id = ?", [
    usuario.id,
  ]);
  await pool.query(
    "INSERT INTO tokens_recuperacion (usuario_id, token_hash, expira_en) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))",
    [usuario.id, tokenHash],
  );

  try {
    await transportador.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Restablece tu contraseña de MEVIPLAST",
      text: `Recibimos una solicitud para cambiar la contraseña de tu cuenta. Abre este enlace antes de 30 minutos: ${enlace}\nSi no solicitaste el cambio, ignora este mensaje.`,
      html: `<p>Recibimos una solicitud para cambiar la contraseña de tu cuenta.</p><p><a href="${enlace}">Restablecer contraseña</a></p><p>El enlace vence en 30 minutos y solo se puede usar una vez. Si no solicitaste el cambio, ignora este mensaje.</p>`,
    });
  } catch (error) {
    await pool.query(
      "DELETE FROM tokens_recuperacion WHERE usuario_id = ? AND token_hash = ?",
      [usuario.id, tokenHash],
    );
    throw error;
  }
  return RESPUESTA_RECUPERACION;
}

async function recordarUsuario(correo) {
  const email = validarCorreo(correo);
  const transportador = crearTransportadorCorreo();
  const [usuarios] = await pool.query(
    "SELECT usuario FROM usuarios WHERE correo = ? AND activo = 1",
    [email],
  );
  if (usuarios.length) {
    const usuario = usuarios[0].usuario;
    const htmlUsuario = usuario.replace(/[&<>"']/g, (caracter) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[caracter]);
    await transportador.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Tu usuario de MEVIPLAST",
      text: `El usuario asociado a este correo es: ${usuario}\nSi no solicitaste este mensaje, puedes ignorarlo.`,
      html: `<p>El usuario asociado a este correo es: <strong>${htmlUsuario}</strong></p><p>Si no solicitaste este mensaje, puedes ignorarlo.</p>`,
    });
  }
  return RESPUESTA_RECUPERACION;
}

async function restablecerPassword(token, password) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    const error = new Error("El enlace de recuperación no es válido o venció");
    error.status = 400;
    throw error;
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    const error = new Error("La contraseña debe tener entre 8 y 128 caracteres");
    error.status = 400;
    throw error;
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const passwordHash = await bcrypt.hash(password, 10);
  const connection = await pool.getConnection();
  let transactionStarted = false;
  let userId;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [tokens] = await connection.query(
      "SELECT t.id, t.usuario_id FROM tokens_recuperacion t JOIN usuarios u ON u.id = t.usuario_id AND u.activo = 1 WHERE t.token_hash = ? AND t.usado_en IS NULL AND t.expira_en > NOW() FOR UPDATE",
      [tokenHash],
    );
    if (!tokens.length) {
      const error = new Error("El enlace de recuperación no es válido o venció");
      error.status = 400;
      throw error;
    }
    userId = tokens[0].usuario_id;
    await connection.query(
      "UPDATE usuarios SET password_hash = ? WHERE id = ? AND activo = 1",
      [passwordHash, userId],
    );
    const [updated] = await connection.query(
      "SELECT ROW_COUNT() AS actualizados",
    );
    if (Number(updated[0].actualizados) !== 1) {
      const error = new Error("El enlace de recuperación no es válido o venció");
      error.status = 400;
      throw error;
    }
    await connection.query(
      "UPDATE tokens_recuperacion SET usado_en = NOW() WHERE usuario_id = ?",
      [userId],
    );
    await connection.commit();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  await registrarAuditoria({
    usuarioId: userId,
    accion: "RESTABLECER_PASSWORD",
    tabla: "usuarios",
    detalle: "Contraseña restablecida mediante enlace de recuperación",
  });
}

async function login(usuario, password) {
  const [filas] = await pool.query(
    "SELECT id, nombre, usuario, password_hash, rol, activo FROM usuarios WHERE usuario = ?",
    [usuario],
  );

  const registro = filas[0];
  if (!registro || !registro.activo) {
    return { ok: false, mensaje: "Usuario o contrasena incorrectos" };
  }

  const passwordValida = await bcrypt.compare(password, registro.password_hash);
  if (!passwordValida) {
    return { ok: false, mensaje: "Usuario o contrasena incorrectos" };
  }

  const payload = {
    id: registro.id,
    usuario: registro.usuario,
    rol: registro.rol,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });

  await registrarAuditoria({
    usuarioId: registro.id,
    accion: "LOGIN",
    tabla: "usuarios",
    detalle: `Inicio de sesion de ${registro.usuario}`,
  });

  return {
    ok: true,
    token,
    usuario: {
      id: registro.id,
      nombre: registro.nombre,
      usuario: registro.usuario,
      rol: registro.rol,
    },
  };
}

module.exports = {
  login,
  solicitarRecuperacion,
  recordarUsuario,
  restablecerPassword,
};
