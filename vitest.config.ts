import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // `server-only` throws outside a React Server Components bundle; tests run plain Node.
      "server-only": fileURLToPath(new URL("./tests/support/empty-module.ts", import.meta.url)),
    },
  },
  test: {
    globals: true,
    include: ["tests/unit/**/*.test.ts", "tests/component/**/*.test.tsx"],
    environment: "node",
    setupFiles: ["./tests/support/setup.ts"],
    css: false,
    restoreMocks: true,
  },
});
