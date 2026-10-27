const { Router } = require("express");
const { pool } = require("../config/database");

const authRoutes = require("./auth.routes");
const usuariosRoutes = require("./usuarios.routes");
const materiaPrimaRoutes = require("./materiaPrima.routes");
const produccionRoutes = require("./produccion.routes");
const inventarioRoutes = require("./inventario.routes");
const ventasRoutes = require("./ventas.routes");
const reportesRoutes = require("./reportes.routes");

const router = Router();

// Verificación de disponibilidad para el despliegue y las pruebas de humo
router.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ estado: "ok", baseDatos: "ok" });
  } catch (error) {
    console.error("Health check: base de datos no disponible:", error.message);
    res.status(503).json({ estado: "error", baseDatos: "no disponible" });
  }
});

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
