const { Router } = require("express");
const controller = require("../controllers/reportes.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken, verificarRol("admin", "supervisor"));

router.get("/produccion", controller.produccion);
router.get("/produccion/detalle", controller.detalleProduccion);
router.get("/produccion/detalle/excel", controller.excelProduccion);
router.get("/ventas", controller.ventas);
router.get("/ventas/detalle", controller.detalleVentas);
router.get("/ventas/detalle/excel", controller.excelVentas);
router.get("/inventario", controller.inventario);
router.get("/auditoria", verificarRol("admin"), controller.auditoria);

module.exports = router;
