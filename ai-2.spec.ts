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
// npx playwright test ai-2.spec.ts

import RelicxSDK from './relicxSdk/src/relicxSdk';

const RELICX_API_ENDPOINT = process.env.RELICX_API_ENDPOINT || 'https://app.relicx.ai';
const API_KEY = process.env.RELICX_API_KEY || 'API_KEY';
const relicx = new RelicxSDK(API_KEY, RELICX_API_ENDPOINT);

// Using Playwright's public TodoMVC demo - accessible to everyone
const URL = 'https://demo.playwright.dev/todomvc';

// Sample Playwright test suite using Relicx SDK for AI-powered assertions
// The test outcome is determined entirely by the Relicx SDK response

test.describe('TodoMVC App', () => {
  test('should add a new todo item', async ({ page }, testInfo) => {
    // Navigate to the TodoMVC app
    await page.goto(URL);

    // Add a new todo item
    const todoText = 'Buy groceries';
    await page.fill('.new-todo', todoText);
    await page.press('.new-todo', 'Enter');

    // Ask Relicx SDK to evaluate the page state
    // The SDK response determines the test outcome
    const question = `Is there a todo item with the text "${todoText}" visible on the page?`;
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
    expect(response.answer, `Relicx assertion passed for: ${response.explanation}`).toBe(true);
    expect(response.confidence, `Confidence assertion passed: ${response.confidence}`).toBeGreaterThanOrEqual(7);
  });

  test('should mark a todo as completed', async ({ page }, testInfo) => {
    // Navigate to the TodoMVC app
    await page.goto(URL);

    // Add a todo item first
    await page.fill('.new-todo', 'Complete this task');
    await page.press('.new-todo', 'Enter');

    // Mark it as completed by clicking the toggle checkbox
    await page.click('.todo-list li .toggle');

    // Ask Relicx SDK to evaluate the page state
    const question = 'Is there a completed (crossed out or checked) todo item on the page?';
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

    // Add key Relicx data as test annotations
    testInfo.annotations.push(
      { type: 'relicx-answer', description: String(response.answer) },
      { type: 'relicx-confidence', description: String(response.confidence) },
      { type: 'relicx-request-id', description: response.requestId },
      { type: 'relicx-explanation', description: response.explanation }
    );

    // The Relicx SDK answer is the sole basis for test pass/fail
    expect(response.answer, `Relicx assertion passed for: ${response.explanation}`).toBe(true);
    expect(response.confidence, `Confidence assertion passed: ${response.confidence}`).toBeGreaterThanOrEqual(7);
  });
});
