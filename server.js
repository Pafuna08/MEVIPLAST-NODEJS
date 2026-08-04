require("dotenv").config();
const app = require("./src/app");
const { verificarConexion } = require("./src/config/database");

const PORT = process.env.PORT || 3000;

async function iniciar() {
  await verificarConexion();
  app.listen(PORT, () => {
    console.log(`MEVIPLAST corriendo en http://localhost:${PORT}`);
  });
}

iniciar();
