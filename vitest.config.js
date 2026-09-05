// Component (DOM) tests — `npm run test:ui`. Kept separate from vite.config.js
// so the PWA/build plugins never load under the test runner.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["test/ui/**/*.test.jsx"],
  },
});
