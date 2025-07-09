import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// Node <20 does not include import.meta.dirname. Compute it manually for
// backward compatibility.
const DIRNAME = typeof import.meta.dirname !== "undefined"
  ? import.meta.dirname
  : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(DIRNAME, "client", "src"),
      "@shared": path.resolve(DIRNAME, "shared"),
      "@assets": path.resolve(DIRNAME, "attached_assets"),
    },
  },
  root: path.resolve(DIRNAME, "client"),
  build: {
    // ✅ Output goes directly to dist/ — no nested /public
    outDir: path.resolve(DIRNAME, "dist"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
