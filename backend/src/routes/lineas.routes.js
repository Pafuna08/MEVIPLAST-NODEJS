const { Router } = require("express");
const controller = require("../controllers/lineas.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken);

// Las ven los roles con formularios de línea (el operario no tiene); solo el administrador crea una nueva (CR-020)
router.get("/", verificarRol("admin", "supervisor", "almacenista", "vendedor"), controller.listar);
router.post("/", verificarRol("admin"), controller.crear);

module.exports = router;
