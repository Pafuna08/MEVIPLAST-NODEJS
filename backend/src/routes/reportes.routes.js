const { Router } = require("express");
const controller = require("../controllers/reportes.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken, verificarRol("admin", "supervisor"));

router.get("/produccion", controller.produccion);
router.get("/ventas", controller.ventas);
router.get("/inventario", controller.inventario);
router.get("/auditoria", verificarRol("admin"), controller.auditoria);

module.exports = router;
