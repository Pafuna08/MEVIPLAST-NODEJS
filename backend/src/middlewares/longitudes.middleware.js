// Largo máximo de los campos de texto según su columna en sql/schema.sql. El saneador corta todo a 255;
// un texto más largo que su columna se rechaza aquí con 400 en lugar de fallar al guardarlo.
// medida admite 80 (materia prima); inventario y producción la limitan a 40 en validarVariante.
const LIMITES = {
  nombre: 120,
  correo: 254,
  cliente: 120,
  medida: 80,
  calibre: 40,
  color: 80,
  ubicacion: 80,
  proveedor: 120,
  tipo: 60,
  detalle: 200,
  observaciones: 255,
};

function validarLongitudes(req, res, next) {
  if (!req.body || typeof req.body !== "object") return next();
  for (const [campo, maximo] of Object.entries(LIMITES)) {
    const valor = req.body[campo];
    if (typeof valor === "string" && valor.length > maximo) {
      return res.status(400).json({ mensaje: `El campo «${campo}» admite máximo ${maximo} caracteres` });
    }
  }
  next();
}

module.exports = { validarLongitudes, LIMITES };
