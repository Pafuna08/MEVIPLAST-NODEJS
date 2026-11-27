// Se carga antes de cada archivo de prueba (npm test y la cobertura). Si una prueba unitaria llega a la
// base sin simularla, apunta a una base que no existe y falla, en lugar de leer o escribir en la base
// configurada en .env (meviplast_db). La suite E2E fija después su propia base desechable.
process.env.DB_NAME = "meviplast_pruebas_sin_base";
