import { test } from '@playwright/test';
import { HarnessAITestSDK } from '@harness/ai-test-sdk';

// pre-requisites
// npx playwright install
// npm i -D @playwright/test
// npx playwright install-deps chromium
// export HARNESS_AI_API_KEY='<your-api-key>'
// export HARNESS_AI_API_ENDPOINT='https://ci-ingress-ben-1.relicx.ai'
// npx playwright test ai-2.spec.ts
//
// The SDK owns the "Harness AI Step" wrapper (step + attach + annotations
// + Answer/Confidence substep assertions). Call `ai.answerForPage(...)`
// directly — no local helper needed.

const ai = new HarnessAITestSDK();

const URL = 'https://demo.playwright.dev/todomvc';

test.describe('TodoMVC App', () => {
  test('should add a new todo item', async ({ page }) => {
    await page.goto(URL);

    const todoText = 'Buy groceries';
    await page.fill('.new-todo', todoText);
    await page.press('.new-todo', 'Enter');

    await ai.answerForPage(
      `Is there a todo item with the text "${todoText}" visible on the page?`,
      page
    );
  });

  test('should mark a todo as completed', async ({ page }) => {
    await page.goto(URL);

    await page.fill('.new-todo', 'Complete this task');
    await page.press('.new-todo', 'Enter');

    await page.click('.todo-list li .toggle');

    await ai.answerForPage(
      'Is there a completed (crossed out or checked) todo item on the page?',
      page
    );
  });
});
