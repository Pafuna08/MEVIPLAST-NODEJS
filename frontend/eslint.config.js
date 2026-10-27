import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/", ".vite/"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/prop-types": "off",
      // Se omiten campos por desestructuración antes de enviar el payload
      "no-unused-vars": ["error", { ignoreRestSiblings: true, caughtErrors: "none" }],
    },
  },
  {
    files: ["js/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: globals.browser },
    rules: {
      // Scripts clásicos del sitio público: `status` es una constante propia, no window.status
      "no-redeclare": ["error", { builtinGlobals: false }],
      "no-unused-vars": ["error", { caughtErrors: "none" }],
    },
  },
  {
    files: ["vite.config.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: globals.node },
  },
];
