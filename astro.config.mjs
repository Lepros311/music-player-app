// astro.config.mjs
// --- Changes: Added Vite logging for debugging ---

import { defineConfig } from "astro/config";

export default defineConfig({
  output: 'server', // --- Changed: Enable server-side rendering for API routes ---
  server: {
    port: 4321,
  },
  vite: {
    logLevel: "info", // --- Added: Enable verbose logging ---
    optimizeDeps: {
      exclude: ["alpinejs"], // --- Added: Exclude Alpine.js to avoid Vite pre-bundling issues ---
    },
  },
});
