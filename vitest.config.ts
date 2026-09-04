import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@certiforge/database": path.resolve(__dirname, "packages/database/src"),
      "@certiforge/qr": path.resolve(__dirname, "packages/qr/src"),
      "@certiforge/editor": path.resolve(__dirname, "packages/editor/src"),
      "@certiforge/types": path.resolve(__dirname, "packages/types/src"),
    },
  },
});
