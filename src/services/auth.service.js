const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");
require("dotenv").config();

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

module.exports = { login };
