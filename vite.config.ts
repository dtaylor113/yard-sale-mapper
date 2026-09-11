import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3000,
    // Bind 3000 or fail loudly — never silently fall through to another port,
    // so the bookmarked http://localhost:3000/ is always the dev server.
    strictPort: true,
  },
  test: {
    // Component tests render into jsdom; the pure-logic suites don't care.
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
