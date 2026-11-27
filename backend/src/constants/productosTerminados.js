const productosTerminados = [
  "Adhesivo PP",
  "Adhesivo Seguridad",
  "Sencilla PP",
  "Bolsas para la basura",
  "Cargadera",
  "Troquel riñón",
];

// CR-019: Cargadera se mide por tallas; las demás líneas, «ancho x largo» (RN-025)
const tallasPorLinea = {
  Cargadera: ["T15", "T20", "T25", "T30"],
};

module.exports = { productosTerminados, tallasPorLinea };
