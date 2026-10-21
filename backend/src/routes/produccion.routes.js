const { Router } = require("express");
const controller = require("../controllers/produccion.controller");
const {
  verificarToken,
  verificarRol,
} = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken);

router.get(
  "/",
  verificarRol("admin", "supervisor", "operario"),
  controller.listar,
);
router.get(
  "/operarios",
  verificarRol("admin", "supervisor"),
  controller.listarOperarios,
);
router.post("/", verificarRol("admin", "supervisor"), controller.crear);
router.put(
  "/:id/estado",
  verificarRol("admin", "supervisor", "operario"),
  controller.cambiarEstado,
);
router.put("/:id", verificarRol("admin", "supervisor"), controller.actualizar);
router.post(
  "/:id/avance",
  verificarRol("operario"),
  controller.registrarAvance,
);
router.delete("/:id", verificarRol("admin"), controller.eliminar);

module.exports = router;
