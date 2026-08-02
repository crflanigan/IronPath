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

/**
 * Which build you are looking at.
 *
 * The version alone could not answer that. It only moves at release time, so
 * every deploy preview between releases showed the same number as production
 * and there was no way to tell them apart in the app — which matters most
 * exactly when you are testing a preview and asking "is this the new one?".
 *
 * Netlify sets these at build time. Locally they are undefined, which is its
 * own useful answer.
 */
const commit = process.env.COMMIT_REF?.slice(0, 7) ?? "dev";
const review = process.env.REVIEW_ID ? `PR #${process.env.REVIEW_ID}` : "";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_BUILD__: JSON.stringify([review, commit].filter(Boolean).join(" · ")),
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
