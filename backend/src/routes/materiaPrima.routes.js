const { Router } = require("express");
const controller = require("../controllers/materiaPrima.controller");
const {
  verificarToken,
  verificarRol,
} = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken);

router.get("/", verificarRol("admin", "supervisor", "almacenista"), controller.listar);
router.get(
  "/bajo-stock",
  verificarRol("admin", "supervisor", "almacenista"),
  controller.bajoStock,
);
router.get(
  "/movimientos",
  verificarRol("admin", "supervisor", "almacenista"),
  controller.listarMovimientos,
);
router.get(
  "/:id/movimientos",
  verificarRol("admin", "supervisor", "almacenista"),
  controller.listarMovimientos,
);
router.post(
  "/movimientos",
  verificarRol("admin", "supervisor", "almacenista"),
  controller.registrarMovimiento,
);
router.get(
  "/:id",
  verificarRol("admin", "supervisor", "almacenista"),
  controller.obtener,
);
router.post("/", verificarRol("admin"), controller.crear);
router.put("/:id", verificarRol("admin", "almacenista"), controller.actualizar);
router.delete("/:id", verificarRol("admin"), controller.eliminar);

module.exports = router;
