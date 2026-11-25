// CR-028 (MEVI-116): «Mi perfil» de cualquier rol, siempre sobre la cuenta del token
const perfilService = require("../services/perfil.service");
const log = require("../utils/logger").crearLogger("perfil");

function responderError(res, error, mensaje) {
  if (error.status) return res.status(error.status).json({ mensaje: error.message });
  log.error("Error al atender la petición", { error });
  return res.status(500).json({ mensaje });
}

async function obtener(req, res) {
  try {
    res.json(await perfilService.obtener(req.usuario.id));
  } catch (error) {
    responderError(res, error, "Error al consultar el perfil");
  }
}

async function actualizar(req, res) {
  try {
    res.json(await perfilService.actualizar(req.usuario.id, req.body || {}));
  } catch (error) {
    responderError(res, error, "Error al actualizar el perfil");
  }
}

async function cambiarPassword(req, res) {
  try {
    const resultado = await perfilService.cambiarPassword(req.usuario.id, req.body || {});
    res.json({ mensaje: "Contraseña actualizada", ...resultado });
  } catch (error) {
    responderError(res, error, "Error al cambiar la contraseña");
  }
}

module.exports = { obtener, actualizar, cambiarPassword };
