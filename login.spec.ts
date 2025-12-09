import { test, expect } from '@playwright/test';

const URL = 'http://prod.dbank.staging-apps.relicx.ai:8080/bank/login';

// Sample Playwright test suite 1
// Contains setup/teardown and two tests that open the login page,
// fill username/password, and click submit

test.describe('Login flow sample 1', () => {
  test.beforeEach(async ({}, testInfo) => {
    console.log(`Setup for ${testInfo.title}`);
  });

  test.afterEach(async ({}, testInfo) => {
    console.log(`Teardown for ${testInfo.title}`);
  });

  test('logs in with valid credentials (case A)', async ({ page }) => {
    await page.goto(URL);
    await page.fill('#username', 'jsmith@demo.io');
    await page.fill('#password', 'Demo123!');
    await page.click('#submit');

    // Optional: add a soft expectation to ensure the click was performed
  });

  test('logs in with valid credentials (case B)', async ({ page }) => {
    await page.goto(URL);
    await page.fill('#username', 'jsmith@demo.io');
    await page.fill('#password', 'Demo123!');
    await page.click('#submit');

    // Optional: soft check on the username field remaining present
  });
});
