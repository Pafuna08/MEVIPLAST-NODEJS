const { Router } = require("express");
const controller = require("../controllers/inventario.controller");
const {
  verificarToken,
  verificarRol,
} = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken);

router.get(
  "/",
  verificarRol("admin", "supervisor", "almacenista", "vendedor"),
  controller.listar,
);
router.get(
  "/movimientos",
  verificarRol("admin", "supervisor", "almacenista"),
  controller.movimientos,
);
router.get(
  "/:id/movimientos",
  verificarRol("admin", "supervisor", "almacenista"),
  controller.movimientos,
);
router.post(
  "/",
  verificarRol("admin", "supervisor", "almacenista"),
  controller.ingresar,
);
router.post(
  "/:id/salida",
  verificarRol("admin", "supervisor", "almacenista"),
  controller.salida,
);

module.exports = router;
