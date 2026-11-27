require("dotenv").config();
const app = require("./src/app");
const { verificarConexion } = require("./src/config/database");
const log = require("./src/utils/logger").crearLogger("server");

const PORT = process.env.PORT || 3000;

async function iniciar() {
  await verificarConexion();
  app.listen(PORT, () => {
    log.info("MEVIPLAST en ejecución", { url: `http://localhost:${PORT}` });
  });
}

iniciar();
