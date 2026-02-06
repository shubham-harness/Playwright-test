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

// Timeouts (from engprod-ui/common/config/timeouts.config.ts)
const Timeouts = {
  SHORT: 5000,
  MEDIUM: 10000,
  LONG: 30000,
  EXTRA_LONG: 60000,
  DEFAULT: 10000,
};

// Element selectors (from engprod-ui/common/locators/element.selector.ts)
const TextBox = {
  EMAIL: "xpath=//input[@name='email'] | //input[@id='email'] | //input[@name='username']",
  PASSWORD: "xpath=//input[@name='password'] | //input[@id='password'] | //*[@formcontrolname='userPassword']//input",
  OKTA_SIGNIN_USERNAME: "xpath=//input[@id='okta-signin-username']",
  OKTA_SIGNIN_PASSWORD: "xpath=//input[@id='okta-signin-password']",
};

const Button = {
  LOGIN: "xpath=//button[@name='submit'] | //button[@name='login'] | //input[@value='Sign in']",
  OKTA_SIGNIN_SUBMIT: "xpath=//input[@id='okta-signin-submit']",
  COOKIE_CONSENT: "xpath=//button[@aria-label='Cookie consent accept']",
};

const Icon = {
  TRACEABLE_ICON: "xpath=//div[@class='traceable-logo'] | //span[@data-icon='harness-logo-white']",
  LOADER_ICON: "xpath=//img[@alt='Loader icon']",
};

// Credentials
const USERNAME = 'test+e2e@traceable.ai';
const PASSWORD = 'L3NH5f$35rHtjBx!';

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
 * Navigate with retry logic (from engprod-ui/common/auth/setup/auth.utils.ts)
 * Uses 'domcontentloaded' for faster navigation instead of 'load'
 */
async function gotoWithRetry(page: Page, url: string, retries = 2): Promise<void> {
  const runtimeTimeout = Timeouts.EXTRA_LONG;
  for (let i = 0; i < retries; i++) {
    try {
      // Use domcontentloaded for faster navigation - don't wait for all resources
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: runtimeTimeout });
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (!errorMessage.includes('net::ERR_NETWORK_CHANGED')) throw err;
      await new Promise((res) => setTimeout(res, 1000));
    }
  }
}

/**
 * Login to Traceable app-staging environment
 * Based on engprod-ui/common/auth/setup/auth.utils.ts enterLoginDetails
 */
async function loginToTraceable(page: Page): Promise<void> {
  // Navigate with retry
  await gotoWithRetry(page, APP_STAGING_CONFIG.authURL);

  const emailLocator = page.locator(TextBox.EMAIL);
  const passwordLocator = page.locator(TextBox.PASSWORD);
  const oktaUserNameLocator = page.locator(TextBox.OKTA_SIGNIN_USERNAME);
  const oktaPasswordLocator = page.locator(TextBox.OKTA_SIGNIN_PASSWORD);
  const loginButtonLocator = page.locator(Button.LOGIN);
  const oktaSubmitLocator = page.locator(Button.OKTA_SIGNIN_SUBMIT);
  const runtimeTimeout = Timeouts.EXTRA_LONG;

  // Handle cookie consent if it appears (Harness environments)
  try {
    const cookieConsent = page.locator(Button.COOKIE_CONSENT);
    if (await cookieConsent.isVisible({ timeout: 2000 })) {
      await cookieConsent.click();
    }
  } catch (_) {
    // ignore if not present
  }

  // NEW FLOW: Check for new login form with specific selectors
  const newUsernameInput = page.locator('.input[id="username"]');
  const newContinueButton = page.locator('._button-login-id:has-text("Continue")');
  const newPasswordInput = page.locator('.input[id="password"]');
  const newLoginButton = page.getByRole('button', { name: 'LOG IN' });

  // Check if new login form is present
  const isNewLoginForm = await newContinueButton.isVisible({ timeout: 10000 }).catch(() => false);

  if (isNewLoginForm) {
    // NEW LOGIN FLOW
    console.log('Using new login flow');

    // Step 1: Enter username
    await newUsernameInput.fill(USERNAME!);

    // Step 2: Click Continue if present
    const isContinueVisible = await newContinueButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (isContinueVisible) {
      await newContinueButton.click();
      await page.waitForTimeout(1000);
    }

    // Step 3: Enter password
    await newPasswordInput.waitFor({ state: 'visible', timeout: runtimeTimeout });
    await newPasswordInput.fill(PASSWORD!);

    // Step 4: Click LOG IN button
    await newLoginButton.click();

    // Wait for navigation after login
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    return;
  }

  // EXISTING FLOWS: Wait for either first-party login input or Okta login input to appear
  const appeared = await Promise.race([
    emailLocator.waitFor({ state: 'visible', timeout: runtimeTimeout }).then(() => 'email'),
    oktaUserNameLocator.waitFor({ state: 'visible', timeout: runtimeTimeout }).then(() => 'okta'),
  ]).catch(() => undefined);

  if (appeared === 'email') {
    await emailLocator.fill(USERNAME!);
  }
  const isPasswordVisible = await passwordLocator.isVisible();

  if (isPasswordVisible) {
    await passwordLocator.fill(PASSWORD!);
    await loginButtonLocator.click();
  } else {
    // OKTA LOGIN
    if (appeared !== 'okta') {
      try {
        const canSeeLogin = await loginButtonLocator.isVisible({ timeout: 3000 });
        if (canSeeLogin) {
          await loginButtonLocator.click({ timeout: 5000 });
        }
      } catch (_) {
        // Ignore if not clickable
      }

      // Try a generic 'Continue' button
      try {
        const continueBtn = page.locator("xpath=//button[contains(normalize-space(.), 'Continue')]");
        if (await continueBtn.isVisible({ timeout: 2000 })) {
          await continueBtn.click({ timeout: 3000 });
        }
      } catch (_) {
        // ignore
      }

      // Press Enter in the email field as last resort
      try {
        if (await emailLocator.isVisible({ timeout: 2000 })) {
          await emailLocator.press('Enter');
        }
      } catch (_) {
        // ignore
      }
    }

    // Wait for Okta username OR an Okta URL to load
    const start = Date.now();
    let oktaVisible = false;
    while (Date.now() - start < runtimeTimeout) {
      try {
        if (await oktaUserNameLocator.isVisible({ timeout: 1000 })) {
          oktaVisible = true;
          break;
        }
      } catch (_) {}
      const urlNow = page.url();
      if (/okta|signin|oauth/i.test(urlNow)) break;
    }
    if (!oktaVisible) {
      await oktaUserNameLocator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    }

    // Helper: click first visible CTA among candidates
    const clickFirstVisible = async (selectors: string[], timeoutPer = 1000) => {
      for (const s of selectors) {
        const l = page.locator(s);
        if (await l.isVisible({ timeout: 300 }).catch(() => false)) {
          await l.click({ timeout: timeoutPer }).catch(() => {});
          return true;
        }
      }
      for (const f of page.frames()) {
        for (const s of selectors) {
          const l = f.locator(s);
          if (await l.isVisible({ timeout: 300 }).catch(() => false)) {
            await l.click({ timeout: timeoutPer }).catch(() => {});
            return true;
          }
        }
      }
      return false;
    };

    // Some Harness sign-in surfaces require revealing the password form first
    await clickFirstVisible([
      "xpath=//button[contains(.,'Use email and password')]",
      "xpath=//button[contains(.,'Sign in with Email') or contains(.,'Sign In with Email')]",
      "xpath=//button[contains(.,'Email') and contains(.,'Continue')]",
      "xpath=//button[contains(.,'Password') and contains(.,'Continue')]",
      "xpath=//a[contains(.,'Sign in') or contains(.,'Sign In')]",
    ]).catch(() => {});

    // Resolve Okta/Harness inputs by searching multiple candidates
    const usernameCandidates = [
      TextBox.OKTA_SIGNIN_USERNAME,
      "xpath=//input[@name='username']",
      "xpath=//input[@type='email']",
      "xpath=//input[contains(translate(@placeholder,'EMAIL','email'),'email')]",
      "xpath=//input[contains(translate(@aria-label,'EMAIL','email'),'email')]",
      "xpath=//input[contains(@data-testid,'email') or contains(@data-test,'email')]",
    ];
    const passwordCandidates = [
      TextBox.OKTA_SIGNIN_PASSWORD,
      "xpath=//input[@name='password']",
      "xpath=//input[@type='password']",
      "xpath=//*[@formcontrolname='password']//input",
    ];
    const submitCandidates = [
      Button.OKTA_SIGNIN_SUBMIT,
      "xpath=//button[@type='submit']",
      "xpath=//input[@type='submit']",
      "xpath=//button[contains(normalize-space(.),'Sign in') or contains(normalize-space(.),'Sign In') or contains(normalize-space(.),'Continue')]",
    ];

    const findFirstVisible = async (selectors: string[]) => {
      for (const s of selectors) {
        const l = page.locator(s);
        if (await l.isVisible({ timeout: 500 }).catch(() => false)) return l;
      }
      for (const f of page.frames()) {
        for (const s of selectors) {
          try {
            const l = f.locator(s);
            if (await l.isVisible({ timeout: 300 }).catch(() => false)) return l;
          } catch (_) {}
        }
      }
      return undefined;
    };

    let oktaUserNameInput = (await findFirstVisible(usernameCandidates)) || oktaUserNameLocator;
    let oktaPasswordInput = (await findFirstVisible(passwordCandidates)) || oktaPasswordLocator;
    let oktaSubmitButton = (await findFirstVisible(submitCandidates)) || oktaSubmitLocator;

    await oktaUserNameInput.waitFor({ state: 'visible', timeout: runtimeTimeout });
    await oktaUserNameInput.fill(USERNAME!);

    // If password isn't visible yet, click Continue/Next/Sign in to advance
    let pwdVisible = await oktaPasswordInput.isVisible({ timeout: 1000 }).catch(() => false);
    if (!pwdVisible) {
      await clickFirstVisible([
        "xpath=//button[contains(normalize-space(.),'Continue')]",
        "xpath=//button[contains(normalize-space(.),'Next')]",
        "xpath=//input[@type='submit']",
        "xpath=//button[@type='submit']",
        "xpath=//button[contains(normalize-space(.),'Sign in') or contains(normalize-space(.),'Sign In')]",
      ], 3000).catch(() => {});

      // Re-resolve password and submit after navigation/UI update
      oktaPasswordInput = (await findFirstVisible(passwordCandidates)) || oktaPasswordLocator;
      oktaSubmitButton = (await findFirstVisible(submitCandidates)) || oktaSubmitLocator;
      await oktaPasswordInput.waitFor({ state: 'visible', timeout: runtimeTimeout });
    }

    await oktaPasswordInput.fill(PASSWORD!);
    await oktaSubmitButton.click();
  }

  // Wait for navigation away from Okta after successful login
  await page.waitForURL(url => !/okta|signin|oauth|login/i.test(url.toString()), { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
}

/**
 * Wait for loaders to disappear (from engprod-ui/common/page-object-models/pages/base.page.ts)
 */
async function waitForLoadersToDisappear(page: Page): Promise<void> {
  const loaders = await page.locator(Icon.LOADER_ICON).all();
  if (loaders.length === 0) return;

  await Promise.all(
    loaders.map(loader =>
      loader.waitFor({
        state: 'hidden',
        timeout: Timeouts.EXTRA_LONG
      }).catch(() => {
        console.warn('Loader did not disappear');
      })
    )
  );
}

/**
 * Wait for dashboard content to be visible (Angular app fully rendered)
 * This ensures the page is not just DOM ready but actually has rendered content
 */
async function waitForDashboardContent(page: Page): Promise<void> {
  // Wait for any of these indicators that the dashboard is loaded
  const contentIndicators = [
    page.getByRole('link', { name: 'Insights' }),
    page.getByRole('link', { name: 'Protection' }),
    page.locator('text=API Discovery'),
    page.locator('text=Posture Insights'),
    page.locator('[data-icon]'), // Any icon element
  ];

  // Wait for at least one indicator to be visible
  const waitPromises = contentIndicators.map(loc => 
    loc.first().waitFor({ state: 'visible', timeout: Timeouts.EXTRA_LONG }).catch(() => null)
  );
  
  await Promise.race(waitPromises);
  
  // Additional small wait for any animations/rendering to complete
  await page.waitForTimeout(2000);
}

/**
 * Navigate to a section - handles both left nav links and tab links
 */
async function navigateToSection(page: Page, sectionName: string): Promise<void> {
  // First ensure dashboard is loaded
  await waitForDashboardContent(page);
  
  // Try to find as a link first (left nav or tabs)
  const link = page.getByRole('link', { name: sectionName });
  
  if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
    await link.click();
    await page.waitForLoadState('domcontentloaded', { timeout: Timeouts.LONG });
    await waitForLoadersToDisappear(page);
    await page.waitForTimeout(2000); // Wait for content to render
  } else {
    // Try as a tab or generic clickable element
    const tab = page.locator(`text="${sectionName}"`).first();
    if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tab.click();
      await page.waitForLoadState('domcontentloaded', { timeout: Timeouts.LONG });
      await waitForLoadersToDisappear(page);
      await page.waitForTimeout(2000); // Wait for content to render
    }
  }
}

test.describe('Traceable App-Staging Tests with Harness AI', () => {
  // Increase timeout for these tests since login + navigation can take time
  test.setTimeout(180000); // 3 minutes

  test('should verify user is logged in successfully', async ({ page }, testInfo) => {
    // Login to Traceable
    await loginToTraceable(page);

    // Wait for dashboard content to fully render (not just DOM ready)
    await waitForDashboardContent(page);
    await waitForLoadersToDisappear(page);

    // Use Harness AI to verify login was successful
    await harnessAIStep(
      page,
      testInfo,
      'Is the user logged into the Traceable application? Look for a navigation menu, dashboard content, or user profile icon that indicates a successful login (not a login form).'
    );
  });

  test('should verify Posture Insights has API Discovery data', async ({ page }, testInfo) => {
    // Login to Traceable
    await loginToTraceable(page);

    // Navigate to Posture Insights tab
    await navigateToSection(page, 'Posture Insights');
    
    // Wait for widgets to render
    await waitForLoadersToDisappear(page);
    await page.waitForTimeout(2000);

    // Use Harness AI to check for API Discovery widget with data
    await harnessAIStep(
      page,
      testInfo,
      'Is there an "API Discovery" widget or metric on this page showing a number greater than zero? Look for a card or widget labeled "API Discovery" with a numeric count.'
    );
  });

  test('should verify Protection dashboard has threat activity widget', async ({ page }, testInfo) => {
    // Login to Traceable
    await loginToTraceable(page);

    // Navigate to Protection module in left nav
    await navigateToSection(page, 'Protection');
    
    // Wait for Protection dashboard content to render
    await waitForLoadersToDisappear(page);
    await page.waitForTimeout(3000); // Extra wait for Protection dashboard widgets

    // Use Harness AI to check for threat-related widgets
    await harnessAIStep(
      page,
      testInfo,
      'Is there a dashboard widget showing threat activity, traffic metrics, or security events? Look for charts, graphs, or metrics related to threats, blocked traffic, or protection status.'
    );
  });
});
