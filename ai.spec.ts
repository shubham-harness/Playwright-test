import { test, expect } from '@playwright/test';
// Import RelicxSDK from local source (CommonJS default export)
// If using the published package instead, replace the require path with: require('relicxsdk')
// eslint-disable-next-line @typescript-eslint/no-var-requires
//
// pre-requisites
// npx playwright install
// npm i -D @playwright/test
// npx playwright install-deps chromium
// export RELICX_API_KEY='<your-api-key>'
// export RELICX_API_ENDPOINT='https://ci-ingress-ben-1.relicx.ai'
// npx playwright test login-alt.spec.ts
// npx playwright test login-alt.spec.ts -g "opens page and submits credentials \(variant 1\)"

import RelicxSDK from './relicxSdk/src/relicxSdk';
// const { RelicxSDK } = require('relicxsdk');

const RELICX_API_ENDPOINT = process.env.RELICX_API_ENDPOINT || 'https://app.relicx.ai';
const API_KEY = process.env.RELICX_API_KEY || 'API_KEY';
const relicx = new RelicxSDK(API_KEY, RELICX_API_ENDPOINT);

const URL = 'http://prod.dbank.staging-apps.relicx.ai:8080/bank/login';

// Sample Playwright test suite 2
// Contains setup/teardown and two tests that open the login page,
// fill username/password, and click submit

test.describe('Login flow sample 2', () => {
  test.beforeEach(async ({}, testInfo) => {
    console.log(`[BeforeEach] Starting: ${testInfo.title}`);
  });

  test.afterEach(async ({}, testInfo) => {
    console.log(`[AfterEach] Finished: ${testInfo.title}`);
  });

  test('opens page and submits credentials (variant 1)', async ({ page }) => {
    await page.goto(URL);
    await page.fill('#username', 'jsmith@demo.io');
    await page.fill('#password', 'Demo123!');
    await page.click('#submit');

    // Ask Relicx a question about the current page state
    const response = await relicx.answerForPage('Is the user not logged in?', page);
    console.log(`Relicx Answer: ${response.answer}`);
    console.log(`Explanation: ${response.explanation}`);
    console.log(`Confidence: ${response.confidence}`);
    console.log(`Request ID: ${response.requestId}`);

    // Optional: verify we stayed on a page and elements are interactable
  });
});