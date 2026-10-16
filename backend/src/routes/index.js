const { Router } = require("express");

const authRoutes = require("./auth.routes");
const usuariosRoutes = require("./usuarios.routes");
const materiaPrimaRoutes = require("./materiaPrima.routes");
const produccionRoutes = require("./produccion.routes");
const inventarioRoutes = require("./inventario.routes");
const ventasRoutes = require("./ventas.routes");
const reportesRoutes = require("./reportes.routes");

const router = Router();

// EP-004 Seguridad
router.use("/auth", authRoutes);
router.use("/usuarios", usuariosRoutes);

// EP-002 Materia Prima
router.use("/materia-prima", materiaPrimaRoutes);

// EP-001 Produccion
router.use("/produccion", produccionRoutes);

// EP-003 Inventario y Ventas
router.use("/inventario", inventarioRoutes);
router.use("/ventas", ventasRoutes);

// EP-005 Reportes
router.use("/reportes", reportesRoutes);

module.exports = router;
