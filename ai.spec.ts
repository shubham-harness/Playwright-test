import { test, expect } from '@playwright/test';
// Import RelicxSDK from local source (CommonJS default export)
// If using the published package instead, replace the require path with: require('relicxsdk')
//
// pre-requisites
// npx playwright install
// npm i -D @playwright/test
// npx playwright install-deps chromium
// export RELICX_API_KEY='<your-api-key>'
// export RELICX_API_ENDPOINT='https://ci-ingress-ben-1.relicx.ai'
// npx playwright test ai.spec.ts

import RelicxSDK from './relicxSdk/src/relicxSdk';

const RELICX_API_ENDPOINT = process.env.RELICX_API_ENDPOINT || 'https://app.relicx.ai';
const API_KEY = process.env.RELICX_API_KEY || 'API_KEY';
const relicx = new RelicxSDK(API_KEY, RELICX_API_ENDPOINT);

const URL = 'http://prod.dbank.staging-apps.relicx.ai:8080/bank/login';

// Sample Playwright test suite using Relicx SDK for AI-powered assertions
// The test outcome is determined entirely by the Relicx SDK response

test.describe('User Authentication', () => {
  test('should successfully log in with valid credentials', async ({ page }, testInfo) => {
    // Navigate and perform login actions
    await page.goto(URL);
    await page.fill('#username', 'jsmith@demo.io');
    await page.fill('#password', 'Demo123!');
    await page.click('#submit');

    // Ask Relicx SDK to evaluate the page state
    // The SDK response determines the test outcome
    const question = 'Is the user logged in successfully?';
    const response = await relicx.answerForPage(question, page);

    // Attach the complete Relicx SDK response as JSON to the report
    await testInfo.attach('relicx-response', {
      body: JSON.stringify({
        question,
        answer: response.answer,
        explanation: response.explanation,
        confidence: response.confidence,
        requestId: response.requestId,
      }, null, 2),
      contentType: 'application/json',
    });

    // Add key Relicx data as test annotations (visible in report metadata)
    testInfo.annotations.push(
      { type: 'relicx-answer', description: String(response.answer) },
      { type: 'relicx-confidence', description: String(response.confidence) },
      { type: 'relicx-request-id', description: response.requestId },
      { type: 'relicx-explanation', description: response.explanation }
    );

    // The Relicx SDK answer is the sole basis for test pass/fail
    // Test passes if answer is true (user is logged in) with sufficient confidence
    expect(response.answer, `Relicx assertion failed: ${response.explanation}`).toBe(true);
    expect(response.confidence, 'Confidence too low for reliable assertion').toBeGreaterThanOrEqual(7);
  });
});
