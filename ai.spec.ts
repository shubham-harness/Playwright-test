import { test, expect, Page, TestInfo } from '@playwright/test';
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

// Sample Playwright test suite using Relicx SDK for AI-powered assertions
// The test outcome is determined entirely by the Relicx SDK response

test.describe('User Authentication', () => {
  test('should successfully log in with valid credentials', async ({ page }, testInfo) => {
    // Navigate and perform login actions
    await page.goto(URL);
    await page.fill('#username', 'jsmith@demo.io');
    await page.fill('#password', 'Demo123!');
    await page.click('#submit');

    // Harness AI Step - single accordion with substeps for API call and assertions
    await harnessAIStep(
      page,
      testInfo,
      'Is the user logged in successfully?'
    );
  });
});
