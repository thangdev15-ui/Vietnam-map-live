import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  root: "apps/frontend",
  plugins: [tailwindcss()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:3001",
      "/socket.io": { target: "http://127.0.0.1:3001", ws: true },
    },
  },
  build: { target: "esnext", outDir: "../../dist/client", emptyOutDir: true },
});
