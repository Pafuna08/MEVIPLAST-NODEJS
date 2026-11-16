import React from "react";
import { createRoot } from "react-dom/client";

// Una sola aplicación React para todo el sitio. Cada dirección carga su página y sus estilos por separado
// (el navegador recarga al pasar de una a otra), así los estilos del sitio público no se mezclan con los del panel.
// Las direcciones se conservan porque los correos de recuperación y los marcadores apuntan a ellas.
const PAGINAS = {
  "/": () => import("./paginas/Sitio.jsx"),
  "/index.html": () => import("./paginas/Sitio.jsx"),
  "/login.html": () => import("./paginas/Login.jsx"),
  "/recuperar.html": () => import("./paginas/Recuperar.jsx"),
  "/dashboard.html": () => import("./paginas/Panel.jsx"),
};

const cargar = PAGINAS[window.location.pathname.toLowerCase()] || PAGINAS["/"];

cargar().then(({ default: Pagina }) => {
  createRoot(document.getElementById("root")).render(<Pagina />);
});
