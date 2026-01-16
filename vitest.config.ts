import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Set reasonable timeouts for API tests
    testTimeout: 30000,
    hookTimeout: 30000,

    // Include test files
    include: ["tests/**/*.test.ts"],

    // Exclude node_modules
    exclude: ["node_modules/**"],

    // Enable globals if needed
    globals: false,
  },
});
