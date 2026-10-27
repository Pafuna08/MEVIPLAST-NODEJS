const authService = require("../services/auth.service");

async function iniciarSesion(req, res) {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ mensaje: "Usuario y contrasena son obligatorios" });
    }

    const resultado = await authService.login(usuario, password);

    if (!resultado.ok) {
      return res.status(resultado.bloqueado ? 423 : 401).json({ mensaje: resultado.mensaje });
    }

    return res.json({ token: resultado.token, usuario: resultado.usuario });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error interno al iniciar sesion" });
  }
}

function responderErrorRecuperacion(res, error, mensaje) {
  if (error.status) return res.status(error.status).json({ mensaje: error.message });
  console.error(error);
  if (error.code === "SMTP_NOT_CONFIGURED") {
    return res.status(503).json({ mensaje: "La recuperación por correo no está disponible: falta configurar SMTP." });
  }
  return res.status(500).json({ mensaje });
}

async function solicitarRecuperacion(req, res) {
  try {
    const mensaje = await authService.solicitarRecuperacion(req.body.correo);
    return res.json({ mensaje });
  } catch (error) {
    return responderErrorRecuperacion(res, error, "No fue posible procesar la solicitud.");
  }
}

async function recordarUsuario(req, res) {
  try {
    const mensaje = await authService.recordarUsuario(req.body.correo);
    return res.json({ mensaje });
  } catch (error) {
    return responderErrorRecuperacion(res, error, "No fue posible procesar la solicitud.");
  }
}

async function restablecerPassword(req, res) {
  try {
    await authService.restablecerPassword(
      req.body.token,
      req.body.password,
    );
    return res.json({ mensaje: "La contraseña se actualizó. Ya puedes iniciar sesión." });
  } catch (error) {
    return responderErrorRecuperacion(res, error, "No fue posible restablecer la contraseña.");
  }
}

module.exports = {
  iniciarSesion,
  solicitarRecuperacion,
  recordarUsuario,
  restablecerPassword,
};
