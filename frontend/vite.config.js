import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "/",
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "dashboard.html"),
    },
  },
});