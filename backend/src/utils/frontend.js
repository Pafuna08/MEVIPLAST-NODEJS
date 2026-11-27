const express = require("express");
const path = require("path");

// Direcciones de la aplicación React. Se conservan las de antes porque los correos de recuperación
// (recuperar.html?token=...) y los marcadores de los usuarios apuntan a ellas.
const PAGINAS = ["/", "/index.html", "/login.html", "/recuperar.html", "/dashboard.html"];

// Publica solo el build de React (frontend/dist): la página base, los paquetes que genera Vite y las imágenes.
// El código fuente (src/), package.json, node_modules y la configuración del frontend no quedan en la
// carpeta publicada, así que no se pueden descargar desde el navegador. Cualquier otra dirección responde 404.
function servirFrontend(carpetaDist) {
  const router = express.Router();
  const paginaBase = path.join(carpetaDist, "index.html");

  router.use(express.static(carpetaDist, { index: false }));
  router.get(PAGINAS, (req, res, next) => {
    // Sin build (npm run build --prefix frontend) la dirección responde 404 en vez de un error del servidor
    res.sendFile(paginaBase, (error) => {
      if (error && !res.headersSent) next();
    });
  });
  return router;
}

module.exports = { servirFrontend, PAGINAS };
