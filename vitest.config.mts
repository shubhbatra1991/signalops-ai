import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: [
      "app/**/*.test.{ts,tsx}",
      "server/**/*.test.ts",
      "features/**/*.test.{ts,tsx}",
      "domain/**/*.test.ts",
    ],
    restoreMocks: true,
  },
});
