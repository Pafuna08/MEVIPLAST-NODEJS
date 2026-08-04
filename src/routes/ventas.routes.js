const { Router } = require("express");
const controller = require("../controllers/ventas.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verificarToken);

router.get("/", controller.listar);
router.post("/", verificarRol("admin", "supervisor"), controller.registrar);

module.exports = router;
