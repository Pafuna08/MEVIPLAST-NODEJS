const jwt = require("jsonwebtoken");
require("dotenv").config();

// Verifica que la peticion traiga un token valido (Authorization: Bearer <token>)
function verificarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ mensaje: "Token no proporcionado" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, payload) => {
    if (error) {
      return res.status(403).json({ mensaje: "Token invalido o expirado" });
    }
    req.usuario = payload; // { id, usuario, rol }
    next();
  });
}

// Restringe una ruta a uno o varios roles: verificarRol("admin", "supervisor")
function verificarRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: "No tienes permisos para esta accion" });
    }
    next();
  };
}

module.exports = { verificarToken, verificarRol };
