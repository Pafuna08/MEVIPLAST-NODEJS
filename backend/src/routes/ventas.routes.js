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
  verificarRol("admin", "vendedor"),
  controller.listar,
);
router.get(
  "/:id/comprobante",
  verificarRol("admin", "vendedor"),
  controller.comprobante,
);
// El supervisor no registra ventas (DEF-007) ni las consulta (CR-021): son información comercial.
router.post("/", verificarRol("admin", "vendedor"), controller.registrar);

module.exports = router;
