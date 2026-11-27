// CR-028 (MEVI-116): «Mi perfil». Cada usuario, de cualquier rol, consulta y cambia su nombre, su usuario y su
// correo, y cambia su contraseña escribiendo la actual. Solo sobre su propia cuenta (el id sale del token).
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");

const FORMATO_USUARIO = /^[a-z0-9._-]{3,50}$/;
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mismo bloqueo del inicio de sesión (RN-024): la contraseña actual equivocada cuenta como intento fallido
const MAX_INTENTOS = Number(process.env.LOGIN_MAX_INTENTOS) || 5;
const MINUTOS_BLOQUEO = Number(process.env.LOGIN_BLOQUEO_MINUTOS) || 15;

function errorDe(mensaje, status = 400) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

// Token nuevo con los datos vigentes: al cambiar el usuario o la contraseña la sesión actual sigue abierta
function firmarToken(fila) {
  return jwt.sign(
    { id: fila.id, usuario: fila.usuario, rol: fila.rol, sv: Number(fila.sesion_version ?? 0) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
  );
}

async function leer(id) {
  const [filas] = await pool.query(
    "SELECT id, nombre, usuario, correo, rol, sesion_version, password_hash, intentos_fallidos, bloqueado_hasta > NOW() AS bloqueado FROM usuarios WHERE id = ? AND activo = 1",
    [id],
  );
  if (!filas[0]) throw errorDe("Usuario no encontrado", 404);
  return filas[0];
}

const publico = ({ id, nombre, usuario, correo, rol }) => ({ id, nombre, usuario, correo, rol });

async function obtener(id) {
  return publico(await leer(id));
}

async function actualizar(id, { nombre, usuario, correo }) {
  const nombreLimpio = typeof nombre === "string" ? nombre.trim().replace(/\s+/g, " ") : "";
  if (!nombreLimpio || nombreLimpio.length > 120) throw errorDe("El nombre completo es obligatorio y admite máximo 120 caracteres");
  const usuarioLimpio = typeof usuario === "string" ? usuario.trim().toLowerCase() : "";
  if (!FORMATO_USUARIO.test(usuarioLimpio)) {
    throw errorDe("El usuario solo admite letras sin tilde, números, punto, guion y guion bajo, sin espacios (3 a 50 caracteres)");
  }
  const correoLimpio = typeof correo === "string" ? correo.trim().toLowerCase() : "";
  if (correoLimpio.length > 254 || !FORMATO_CORREO.test(correoLimpio)) throw errorDe("El correo electrónico no es válido");

  const anterior = await leer(id);
  // MEVI-117: qué datos cambian de verdad; si ninguno, no se escribe nada ni se audita
  const cambios = [
    anterior.nombre !== nombreLimpio && "nombre",
    anterior.usuario !== usuarioLimpio && "usuario",
    (anterior.correo || "") !== correoLimpio && "correo",
  ].filter(Boolean);
  if (!cambios.length) return { usuario: publico(anterior), token: firmarToken(anterior), cambios };
  try {
    await pool.query("UPDATE usuarios SET nombre = ?, usuario = ?, correo = ? WHERE id = ?", [nombreLimpio, usuarioLimpio, correoLimpio, id]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw errorDe(String(error.message).includes("uq_usuarios_correo") ? "El correo electrónico ya está registrado" : "El nombre de usuario ya existe", 409);
    }
    throw error;
  }
  const detalle = cambios.map((campo) => (campo === "usuario" ? `usuario (${anterior.usuario} → ${usuarioLimpio})` : campo));
  await registrarAuditoria({ usuarioId: id, accion: "ACTUALIZAR_PERFIL", tabla: "usuarios", detalle: `Cambió su ${detalle.join(", ")}` });
  const actual = await leer(id);
  return { usuario: publico(actual), token: firmarToken(actual), cambios };
}

async function cambiarPassword(id, { actual, nueva }) {
  if (typeof actual !== "string" || !actual) throw errorDe("Escribe tu contraseña actual");
  if (typeof nueva !== "string" || nueva.length < 8 || nueva.length > 128) throw errorDe("La nueva contraseña debe tener entre 8 y 128 caracteres");
  if (nueva === actual) throw errorDe("La nueva contraseña debe ser distinta de la actual");

  const fila = await leer(id);
  if (Number(fila.bloqueado)) {
    throw errorDe(`La cuenta está bloqueada temporalmente por intentos fallidos. Intenta de nuevo en ${MINUTOS_BLOQUEO} minutos.`, 423);
  }
  if (!(await bcrypt.compare(actual, fila.password_hash))) {
    await pool.query(
      `UPDATE usuarios SET
        bloqueado_hasta = CASE WHEN intentos_fallidos + 1 >= ? THEN DATE_ADD(NOW(), INTERVAL ? MINUTE) ELSE NULL END,
        intentos_fallidos = CASE WHEN intentos_fallidos + 1 >= ? THEN 0 ELSE intentos_fallidos + 1 END
       WHERE id = ?`,
      [MAX_INTENTOS, MINUTOS_BLOQUEO, MAX_INTENTOS, id],
    );
    throw errorDe("La contraseña actual no es correcta");
  }
  const hash = await bcrypt.hash(nueva, 10);
  // Las demás sesiones abiertas de la cuenta dejan de servir (HU-020); esta recibe un token nuevo
  await pool.query(
    "UPDATE usuarios SET password_hash = ?, intentos_fallidos = 0, bloqueado_hasta = NULL, sesion_version = sesion_version + 1 WHERE id = ?",
    [hash, id],
  );
  await registrarAuditoria({ usuarioId: id, accion: "CAMBIAR_CONTRASENA", tabla: "usuarios", detalle: `Cambió su contraseña (${fila.usuario})` });
  return { token: firmarToken(await leer(id)) };
}

module.exports = { obtener, actualizar, cambiarPassword };
