import { defineConfig } from '@playwright/test';

/**
 * Playwright config for tunnel E2E test.
 *
 * NOTE: When this build is triggered with tunnelName in configOverride,
 * the job executor will generate a wrapper config that layers proxy settings
 * on top of this config. You do NOT need to add proxy settings here.
 *
 * The BASE_URL env var controls which URL the test hits:
 *   - For local testing:  BASE_URL=http://127.0.0.1:3001
 *   - Via tunnel:          BASE_URL=http://127.0.0.1:3001  (resolved from the tunnel client's perspective)
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});

