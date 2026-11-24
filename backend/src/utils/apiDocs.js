const fs = require("fs");
const path = require("path");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const { crearLogger } = require("./logger");

const log = crearLogger("docs");

// Contrato OpenAPI 3.0.3 de la API: el mismo archivo que openapi.test.js compara con las rutas de Express,
// así que la documentación que se ve en Swagger UI no puede quedar desfasada del código.
const CONTRATO = path.join(__dirname, "..", "..", "..", "docs", "api", "openapi.json");
const RUTA = "/api-docs";

const OPCIONES = {
  customSiteTitle: "API MEVIPLAST · Swagger",
  // Sin la barra superior de Swagger (su logo y el campo para cargar otro contrato)
  customCss: ".swagger-ui .topbar { display: none }",
  swaggerOptions: {
    docExpansion: "list",
    filter: true,
    // Muestra x-roles: los roles que admite cada operación
    showExtensions: true,
    displayRequestDuration: true,
    // El token pegado en «Authorize» se olvida al cerrar o recargar la página
    persistAuthorization: false,
  },
};

// Swagger UI en /api-docs y el contrato en /api-docs/openapi.json. Solo documenta: las peticiones de
// «Try it out» pasan por la API normal, con su token, sus roles y sus validaciones.
// API_DOCS=off la desactiva y esas direcciones responden 404 como cualquier otra.
function servirDocumentacionApi({ habilitada = process.env.API_DOCS !== "off", contrato = CONTRATO } = {}) {
  const router = express.Router();
  if (!habilitada) return router;
  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(contrato, "utf8"));
  } catch (error) {
    // Sin el contrato la aplicación sigue funcionando; solo no se publica la documentación
    log.warn("No se pudo leer el contrato OpenAPI; /api-docs no se publica", { error, contrato });
    return router;
  }
  router.get(`${RUTA}/openapi.json`, (req, res) => res.json(spec));
  router.use(RUTA, swaggerUi.serve, swaggerUi.setup(spec, OPCIONES));
  return router;
}

module.exports = { servirDocumentacionApi, RUTA };
