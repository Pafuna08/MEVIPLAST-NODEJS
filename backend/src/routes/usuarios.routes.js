const { Router } = require("express");
const usuariosController = require("../controllers/usuarios.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

// Todas las rutas de usuarios requieren estar autenticado y ser admin
router.use(verificarToken, verificarRol("admin"));

router.get("/", usuariosController.listar);
router.post("/", usuariosController.crear);
router.put("/:id", usuariosController.actualizar);
router.delete("/:id", usuariosController.eliminar);

module.exports = router;
