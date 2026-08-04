const express = require("express");
const cors = require("cors");
const path = require("path");
const apiRoutes = require("./routes");

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API REST (todos los modulos: seguridad, materia prima, produccion, inventario, ventas, reportes)
app.use("/api", apiRoutes);

// Vista (frontend estatico: index, login y dashboards por rol)
app.use(express.static(path.join(__dirname, "..", "public")));

// Manejo de rutas de API no encontradas
app.use("/api", (req, res) => {
  res.status(404).json({ mensaje: "Recurso no encontrado" });
});

// Manejador de errores centralizado
app.use((error, req, res, next) => {
  console.error("Error no controlado:", error);
  res.status(500).json({ mensaje: "Error interno del servidor" });
});

module.exports = app;
