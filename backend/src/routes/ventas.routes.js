const { Router } = require("express");
const controller = require("../controllers/ventas.controller");
const {
  verificarToken,
  verificarRol,
} = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken);

router.get(
  "/",
  verificarRol("admin", "supervisor", "vendedor"),
  controller.listar,
);
router.get(
  "/:id/comprobante",
  verificarRol("admin", "supervisor", "vendedor"),
  controller.comprobante,
);
router.post(
  "/",
  verificarRol("admin", "supervisor", "vendedor"),
  controller.registrar,
);

module.exports = router;
