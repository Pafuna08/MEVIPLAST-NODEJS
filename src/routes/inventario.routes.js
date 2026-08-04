const { Router } = require("express");
const controller = require("../controllers/inventario.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken);

router.get("/", controller.listar);
router.post("/", verificarRol("admin", "supervisor"), controller.ingresar);
router.post("/:id/salida", verificarRol("admin", "supervisor"), controller.salida);

module.exports = router;
