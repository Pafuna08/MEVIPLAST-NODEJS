import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => {
  const backendEnv = loadEnv(mode, resolve(__dirname, "../backend"), "");
  const apiPort = process.env.API_PORT || process.env.PORT || backendEnv.PORT || "3000";

  return {
    base: "/",
    server: {
      proxy: {
        "/api": `http://localhost:${apiPort}`,
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, "dashboard.html"),
      },
    },
  };
});