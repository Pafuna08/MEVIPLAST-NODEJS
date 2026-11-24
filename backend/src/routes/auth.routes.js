const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const { verificarToken } = require("../middlewares/auth.middleware");

const router = Router();

// POST /api/auth/login
router.post("/login", authController.iniciarSesion);
router.post("/recuperar-password", authController.solicitarRecuperacion);
router.post("/recordar-usuario", authController.recordarUsuario);
router.post("/restablecer-password", authController.restablecerPassword);
// HU-020: cerrar sesión revoca el token en el servidor (cualquier rol con sesión válida)
router.post("/logout", verificarToken, authController.cerrarSesion);

module.exports = router;
