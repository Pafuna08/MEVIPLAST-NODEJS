const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: {
      // El manejador de errores de Express necesita los cuatro parámetros aunque no use `next`
      "no-unused-vars": ["error", { args: "after-used", argsIgnorePattern: "^(next|_)", caughtErrors: "none" }],
    },
  },
];
