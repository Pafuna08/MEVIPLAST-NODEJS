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
// CR-026: el historial de movimientos (compras con costo y factura, ajustes y consumos) es del administrador
// y del almacenista. El supervisor ya no tiene la vista de Materias primas: sigue listando las bobinas (las
// elige en sus órdenes), recibe el aviso de stock bajo y registra el consumo de sus órdenes desde Seguimiento
router.get(
  "/movimientos",
  verificarRol("admin", "almacenista"),
  controller.listarMovimientos,
);
router.get(
  "/:id/movimientos",
  verificarRol("admin", "almacenista"),
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
