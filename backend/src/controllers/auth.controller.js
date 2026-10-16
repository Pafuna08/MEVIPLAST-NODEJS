const authService = require("../services/auth.service");

async function iniciarSesion(req, res) {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ mensaje: "Usuario y contrasena son obligatorios" });
    }

    const resultado = await authService.login(usuario, password);

    if (!resultado.ok) {
      return res.status(401).json({ mensaje: resultado.mensaje });
    }

    return res.json({ token: resultado.token, usuario: resultado.usuario });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error interno al iniciar sesion" });
  }
}

module.exports = { iniciarSesion };
