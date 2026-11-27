const { Router } = require("express");
const controller = require("../controllers/inventario.controller");
const {
  verificarToken,
  verificarRol,
} = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken);

// Las existencias las consultan todos los roles con formularios de producto (el supervisor, en su Inicio)
router.get(
  "/",
  verificarRol("admin", "supervisor", "almacenista", "vendedor"),
  controller.listar,
);
// DEF-044: los ingresos, las salidas manuales y su historial son del administrador y del almacenista. El supervisor
// no tiene la vista de Inventario: ve las existencias en su Inicio y en el reporte de inventario, y el producto
// terminado entra solo cuando el operario registra su avance
router.get(
  "/movimientos",
  verificarRol("admin", "almacenista"),
  controller.movimientos,
);
router.get(
  "/:id/movimientos",
  verificarRol("admin", "almacenista"),
  controller.movimientos,
);
router.post(
  "/",
  verificarRol("admin", "almacenista"),
  controller.ingresar,
);
router.post(
  "/:id/salida",
  verificarRol("admin", "almacenista"),
  controller.salida,
);

module.exports = router;
