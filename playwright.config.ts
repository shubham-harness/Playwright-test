import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["*.spec.ts"],
  // tunnel-e2e-test is a separate sub-project with its own config
  testIgnore: ["**/tunnel-e2e-test/**"],
  /* You can run: npx playwright test */
  timeout: 5 * 60 * 1000,
  expect: { timeout: 10 * 1000 },
  workers: 1,
  // Emit machine-readable run results
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/report.json" }],
    ["html", { outputFolder: "artifacts/html", open: "never" }],
    ["junit", { outputFile: 'artifacts/results.xml' }],
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
