import { test } from '@playwright/test';
import RelicxPlaywrightSDK from 'relicx-playwright-sdk';

// pre-requisites
// npx playwright install
// npm i -D @playwright/test
// npx playwright install-deps chromium
// export RELICX_API_KEY='<your-api-key>'
// export RELICX_API_ENDPOINT='https://ci-ingress-ben-1.relicx.ai'
// npx playwright test ai.spec.ts
//
// The SDK now owns the "Harness AI Step" wrapper (step + attach + annotations
// + Answer/Confidence substep assertions). The previous local `harnessAIStep`
// helper has been removed — call `relicx.answerForPage(...)` directly.

const relicx = new RelicxPlaywrightSDK();

const URL = 'http://prod.dbank.staging-apps.relicx.ai:8080/bank/login';

test.describe('User Authentication', () => {
  // /assert can take 30-90s (2 LLM calls server-side). Give it room before
  // we even ask whether the gateway is the bottleneck.
  test.setTimeout(180_000);

  test('should successfully log in with valid credentials', async ({ page }) => {
    await page.goto(URL);
    await page.fill('#username', 'jsmith@demo.io');
    await page.fill('#password', 'Demo123!');
    await page.click('#submit');

    await relicx.answerForPage('Is the user logged in successfully?', page);
  });
});
