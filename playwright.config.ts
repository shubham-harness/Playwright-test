import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["*.spec.ts"],
  /* You can run: npx playwright test */
  timeout: 30 * 1000,
  expect: { timeout: 10 * 1000 },
  // Emit machine-readable run results
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/report.json" }],
    ["html", { outputFolder: "artifacts/html", open: "never" }],
  ],
  use: {
    headless: true,
    baseURL: "http://prod.dbank.staging-apps.relicx.ai:8080",
    actionTimeout: 10 * 1000,
    navigationTimeout: 15 * 1000,
    trace: "on", // network + console + snapshots inside the trace
    video: "on",
    screenshot: "on",
  },
});
