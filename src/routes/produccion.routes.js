const { Router } = require("express");
const controller = require("../controllers/produccion.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken);

router.get("/", controller.listar);
router.post("/", verificarRol("admin", "supervisor"), controller.crear);
router.put("/:id/estado", verificarRol("admin", "supervisor", "operario"), controller.cambiarEstado);
router.delete("/:id", verificarRol("admin"), controller.eliminar);

module.exports = router;
