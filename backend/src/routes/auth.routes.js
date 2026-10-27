const { Router } = require("express");
const authController = require("../controllers/auth.controller");

const router = Router();

// POST /api/auth/login
router.post("/login", authController.iniciarSesion);
router.post("/recuperar-password", authController.solicitarRecuperacion);
router.post("/recordar-usuario", authController.recordarUsuario);
router.post("/restablecer-password", authController.restablecerPassword);

module.exports = router;
