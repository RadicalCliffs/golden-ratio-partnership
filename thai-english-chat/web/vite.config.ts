import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const SERVER = "http://localhost:8787";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The wire protocol lives with the server; the client imports the same file
      // rather than keeping a second copy that can drift out of sync.
      "@protocol": fileURLToPath(new URL("../server/src/protocol.ts", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    fs: { allow: [".."] },
    proxy: {
      "/api": SERVER,
      "/ws": { target: SERVER.replace("http", "ws"), ws: true },
    },
  },
  build: { outDir: "dist", sourcemap: true },
});
