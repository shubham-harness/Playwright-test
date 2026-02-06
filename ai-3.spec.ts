import { test, expect, Page, TestInfo } from '@playwright/test';
// Import RelicxSDK for Harness AI assertions
import RelicxSDK from './relicxSdk/src/relicxSdk';

// pre-requisites
// npx playwright install
// npm i -D @playwright/test
// npx playwright install-deps chromium
// Required environment variables:
// export RELICX_API_KEY='<your-api-key>'
// export RELICX_API_ENDPOINT='https://ci-ingress-ben-1.relicx.ai'
// export PLATFORM_USER='<your-traceable-username>'
// export PLATFORM_PASSWORD='<your-traceable-password>'
// npx playwright test ai-3.spec.ts

const RELICX_API_ENDPOINT = process.env.RELICX_API_ENDPOINT || 'https://app.relicx.ai';
const API_KEY = process.env.RELICX_API_KEY || 'API_KEY';
const relicx = new RelicxSDK(API_KEY, RELICX_API_ENDPOINT);

// App-staging environment config (based on engprod-ui/appsec-ui-tests/environment.ts)
const APP_STAGING_CONFIG = {
  baseURL: 'https://app-staging.traceable.ai',
  authURL: 'https://app-staging.traceable.ai/login',
};

// Credentials from environment variables
const USERNAME = process.env.PLATFORM_USER;
const PASSWORD = process.env.PLATFORM_PASSWORD;

// Validate required environment variables
if (!USERNAME || !PASSWORD) {
  throw new Error('PLATFORM_USER and PLATFORM_PASSWORD environment variables are required');
}

/**
 * Harness AI Step - wraps the entire Relicx SDK interaction in a single accordion step
 * with substeps for answer validation and confidence check.
 * The parent step passes only if all substeps pass.
 */
async function harnessAIStep(
  page: Page,
  testInfo: TestInfo,
  question: string,
  expectedAnswer: boolean = true,
  minConfidence: number = 7
) {
  await test.step('Harness AI Step', async () => {
    // Make the API call to Harness AI (screenshot and content fetch are internal)
    const response = await relicx.answerForPage(question, page);

    // Attach the complete response as JSON to the report
    await testInfo.attach('harness-ai-response', {
      body: JSON.stringify({
        question,
        answer: response.answer,
        explanation: response.explanation,
        confidence: response.confidence,
        requestId: response.requestId,
      }, null, 2),
      contentType: 'application/json',
    });

    // Add key data as test annotations
    testInfo.annotations.push(
      { type: 'harness-ai-answer', description: String(response.answer) },
      { type: 'harness-ai-confidence', description: String(response.confidence) },
      { type: 'harness-ai-request-id', description: response.requestId },
      { type: 'harness-ai-explanation', description: response.explanation }
    );

    // Substep: Validate Answer
    await test.step(`Answer: ${response.answer} - ${response.explanation}`, async () => {
      expect(
        response.answer,
        `Harness AI answer was ${response.answer}, expected ${expectedAnswer}. Explanation: ${response.explanation}`
      ).toBe(expectedAnswer);
    });

    // Substep: Validate Confidence
    await test.step(`Confidence: ${response.confidence}/10`, async () => {
      expect(
        response.confidence,
        `Confidence ${response.confidence} is below minimum threshold ${minConfidence}`
      ).toBeGreaterThanOrEqual(minConfidence);
    });
  });
}

/**
 * Login to Traceable app-staging environment
 */
async function loginToTraceable(page: Page): Promise<void> {
  await page.goto(APP_STAGING_CONFIG.authURL);
  await page.waitForLoadState('domcontentloaded');

  // Handle different login form variations
  // Try new login flow first (username -> continue -> password -> login)
  const usernameInput = page.locator('input[id="username"], input[name="username"], input[type="email"]').first();
  const continueButton = page.locator('button:has-text("Continue")').first();
  const passwordInput = page.locator('input[id="password"], input[name="password"], input[type="password"]').first();
  const loginButton = page.locator('button:has-text("LOG IN"), button:has-text("Login"), button:has-text("Sign in"), button[type="submit"]').first();

  // Wait for username field and fill it
  await usernameInput.waitFor({ state: 'visible', timeout: 30000 });
  await usernameInput.fill(USERNAME!);

  // Check if there's a Continue button (multi-step login)
  const hasContinue = await continueButton.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasContinue) {
    await continueButton.click();
    await page.waitForTimeout(1000);
  }

  // Fill password
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill(PASSWORD!);

  // Click login
  await loginButton.click();

  // Wait for navigation to complete
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

/**
 * Navigate to AppSec module using module switcher
 */
async function navigateToAppSecPosture(page: Page): Promise<void> {
  // Click the module switcher (nine-dot menu)
  await page.locator('span[data-icon="nine-dot-options"]').click();
  // Click on AppSec Posture module
  await page.locator('a[id="mode-card-link"][href*="appsec-posture"]').click();
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await page.waitForTimeout(2000);
}

/**
 * Navigate to a dashboard section
 */
async function navigateToDashboard(page: Page, dashboardName: string): Promise<void> {
  // Click on the dashboard link in left nav
  await page.getByRole('link', { name: dashboardName }).click();
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  
  // Wait for loaders to disappear
  const loaders = page.locator('mat-spinner, .loader, [class*="spinner"]');
  await loaders.first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

// Dashboard widgets to verify
const dashboardWidgets = [
  { dashboard: 'Dashboards', widget: 'chart or graph or visualization' },
  { dashboard: 'Overview', widget: 'summary or statistics or metrics' },
];

test.describe('Traceable App-Staging Dashboard Tests with Harness AI', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginToTraceable(page);
  });

  test('should verify Posture Insights dashboard has visualization widgets', async ({ page }, testInfo) => {
    // Navigate to AppSec Posture module
    await navigateToAppSecPosture(page);

    // Navigate to Dashboards section
    await navigateToDashboard(page, 'Dashboards');

    // Use Harness AI to verify widget presence
    await harnessAIStep(
      page,
      testInfo,
      'Is there at least one dashboard widget visible on the page? Look for charts, graphs, tables, or data visualization components.'
    );
  });

  test('should verify Overview dashboard has summary metrics', async ({ page }, testInfo) => {
    // Navigate to AppSec Posture module
    await navigateToAppSecPosture(page);

    // Navigate to Overview section
    await navigateToDashboard(page, 'Overview');

    // Use Harness AI to verify metrics/summary widgets
    await harnessAIStep(
      page,
      testInfo,
      'Does the page display any summary statistics, metrics, or key performance indicators (KPIs)? Look for numbers, percentages, or metric cards.'
    );
  });

  test('should verify API Activity dashboard has data tables or charts', async ({ page }, testInfo) => {
    // Navigate to AppSec Posture module
    await navigateToAppSecPosture(page);

    // Navigate to Dashboards and then to API Activity tab if available
    await navigateToDashboard(page, 'Dashboards');
    
    // Try to click on API Activity tab
    const apiActivityTab = page.locator('text=API Activity');
    const hasTab = await apiActivityTab.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasTab) {
      await apiActivityTab.click();
      await page.waitForTimeout(2000);
    }

    // Use Harness AI to verify data visualization
    await harnessAIStep(
      page,
      testInfo,
      'Is there a data table or chart showing API activity, endpoints, or traffic information on this dashboard?'
    );
  });
});
