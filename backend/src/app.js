const express = require("express");
const cors = require("cors");
const path = require("path");
const apiRoutes = require("./routes");
const { sanitizarObjeto } = require("./utils/sanitizar");
const { crearLogger, registrarPeticiones } = require("./utils/logger");

const log = crearLogger("app");
const app = express();

// Express sirve el panel desde el mismo origen; solo los orígenes listados en
// CORS_ORIGINS (separados por comas) pueden llamar a la API desde otro dominio.
const origenesPermitidos = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);

// Middlewares globales
app.use(cors({ origin: origenesPermitidos.length ? origenesPermitidos : false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizarObjeto(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizarObjeto(req.query);
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizarObjeto(req.params);
  }
  next();
});

// API REST (todos los modulos: seguridad, materia prima, produccion, inventario, ventas, reportes)
app.use("/api", registrarPeticiones, apiRoutes);

// El build React tiene prioridad; el resto del sitio estático permanece disponible.
const frontendPath = path.join(__dirname, "..", "..", "frontend");
app.use(express.static(path.join(frontendPath, "dist")));
app.use(express.static(frontendPath));

// Manejo de rutas de API no encontradas
app.use("/api", (req, res) => {
  res.status(404).json({ mensaje: "Recurso no encontrado" });
});

// Manejador de errores centralizado
app.use((error, req, res, next) => {
  log.error("Error no controlado", { error, metodo: req.method, ruta: req.originalUrl.split("?")[0] });
  res.status(500).json({ mensaje: "Error interno del servidor" });
});

module.exports = app;
