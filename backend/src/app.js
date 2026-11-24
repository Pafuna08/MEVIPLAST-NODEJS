const express = require("express");
const cors = require("cors");
const path = require("path");
const apiRoutes = require("./routes");
const { sanitizarObjeto } = require("./utils/sanitizar");
const { crearLogger, registrarPeticiones } = require("./utils/logger");
const { validarLongitudes } = require("./middlewares/longitudes.middleware");
const { servirFrontend } = require("./utils/frontend");
const { servirDocumentacionApi } = require("./utils/apiDocs");

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
app.use("/api", registrarPeticiones, validarLongitudes, apiRoutes);

// Documentación de la API con Swagger UI en /api-docs, a partir de docs/api/openapi.json (API_DOCS=off la apaga)
app.use(servirDocumentacionApi());

// Solo se publica el build de React; el código fuente y la configuración del frontend no se sirven
app.use(servirFrontend(path.join(__dirname, "..", "..", "frontend", "dist")));

// Manejo de rutas de API no encontradas
app.use("/api", (req, res) => {
  res.status(404).json({ mensaje: "Recurso no encontrado" });
});

// Manejador de errores centralizado
app.use((error, req, res, next) => {
  // DEF-023: un cuerpo que no es JSON válido es un error del cliente, no del servidor
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ mensaje: "El cuerpo de la petición no es un JSON válido" });
  }
  log.error("Error no controlado", { error, metodo: req.method, ruta: req.originalUrl.split("?")[0] });
  res.status(500).json({ mensaje: "Error interno del servidor" });
});

module.exports = app;
