import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

// Node <20 does not include import.meta.dirname. Compute it manually for
// backward compatibility.
const DIRNAME = typeof import.meta.dirname !== "undefined"
  ? import.meta.dirname
  : path.dirname(fileURLToPath(import.meta.url));

// The version the app displays comes from package.json, substituted at build
// time. It used to be typed into the Settings dialog by hand, which is how the
// app came to advertise a v1.1.2 that was never tagged while package.json still
// said 1.0.0. Importing package.json into the client instead would bundle the
// whole dependency list, so this is a define rather than an import.
const { version } = JSON.parse(
  readFileSync(path.resolve(DIRNAME, "package.json"), "utf-8"),
) as { version: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(DIRNAME, "client", "src"),
      "@shared": path.resolve(DIRNAME, "shared"),
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
