const { Router } = require("express");
const controller = require("../controllers/materiaPrima.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken);

router.get("/", controller.listar);
router.get("/bajo-stock", controller.bajoStock);
router.get("/:id", controller.obtener);
router.post("/", verificarRol("admin", "supervisor"), controller.crear);
router.put("/:id", verificarRol("admin", "supervisor"), controller.actualizar);
router.delete("/:id", verificarRol("admin"), controller.eliminar);

module.exports = router;
