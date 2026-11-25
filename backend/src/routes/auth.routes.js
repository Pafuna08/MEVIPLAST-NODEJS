const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const perfilController = require("../controllers/perfil.controller");
const { verificarToken } = require("../middlewares/auth.middleware");

const router = Router();

// POST /api/auth/login
router.post("/login", authController.iniciarSesion);
router.post("/recuperar-password", authController.solicitarRecuperacion);
router.post("/recordar-usuario", authController.recordarUsuario);
router.post("/restablecer-password", authController.restablecerPassword);
// HU-020: cerrar sesión revoca el token en el servidor (cualquier rol con sesión válida)
router.post("/logout", verificarToken, authController.cerrarSesion);
// CR-028: «Mi perfil» (cualquier rol): datos propios y cambio de contraseña con la actual
router.get("/perfil", verificarToken, perfilController.obtener);
router.put("/perfil", verificarToken, perfilController.actualizar);
router.put("/perfil/password", verificarToken, perfilController.cambiarPassword);

module.exports = router;
