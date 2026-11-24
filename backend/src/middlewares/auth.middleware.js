const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");
const log = require("../utils/logger").crearLogger("auth");
require("dotenv").config();

const MENSAJE_SESION_INVALIDA = "Tu sesión ya no es válida. Inicia sesión de nuevo.";

// Verifica que la petición traiga un token válido (Authorization: Bearer <token>)
// y que el usuario siga activo y con el mismo rol que tenía al iniciar sesión.
async function verificarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ mensaje: "Token no proporcionado" });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET); // { id, usuario, rol }
  } catch {
    // 401 para que el panel cierre la sesión y lleve al login
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }

  try {
    const [usuarios] = await pool.query("SELECT activo, rol, sesion_version FROM usuarios WHERE id = ?", [payload.id]);
    const usuario = usuarios[0];
    // HU-020: al cerrar sesión (o restablecer la contraseña) sube sesion_version y los tokens anteriores
    // dejan de servir. Los tokens sin «sv» y las filas sin la columna cuentan como versión 0.
    const versionToken = Number(payload.sv ?? 0);
    const versionActual = Number(usuario?.sesion_version ?? 0);
    if (!usuario || !Number(usuario.activo) || usuario.rol !== payload.rol || versionToken !== versionActual) {
      return res.status(401).json({ mensaje: MENSAJE_SESION_INVALIDA });
    }
  } catch (error) {
    log.error("No se pudo verificar la sesión", { error });
    return res.status(500).json({ mensaje: "Error interno al verificar la sesión" });
  }

  req.usuario = payload;
  next();
}

// Restringe una ruta a uno o varios roles: verificarRol("admin", "supervisor")
function verificarRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: "No tienes permisos para esta acción" });
    }
    next();
  };
}

module.exports = { verificarToken, verificarRol };
