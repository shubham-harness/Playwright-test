import { test, expect } from '@playwright/test';

// INTENTIONALLY FLAKY tests, for exercising flaky detection / retry reporting.
// Each one fails for a different, realistic reason. Retries are enabled so
// Playwright classifies "failed then passed" runs as "flaky".
test.describe.configure({ retries: 2 });

test.describe('flaky (intentional)', () => {
  // 1. Random latency vs. a too-tight timeout (~50% failure).
  test('slow widget vs tight timeout', async ({ page }) => {
    await page.setContent(`
      <p id="status">loading</p>
      <script>
        setTimeout(() => { document.getElementById('status').textContent = 'ready'; },
                   Math.random() * 600);
      </script>`);
    await expect(page.locator('#status')).toHaveText('ready', { timeout: 300 });
  });

  // 2. Race condition: two async writers, assertion assumes a fixed order.
  test('race between two async updates', async ({ page }) => {
    await page.setContent(`
      <p id="out"></p>
      <script>
        const out = document.getElementById('out');
        setTimeout(() => { out.textContent += 'A'; }, Math.random() * 100);
        setTimeout(() => { out.textContent += 'B'; }, Math.random() * 100);
      </script>`);
    await expect(page.locator('#out')).toHaveText(/^..$/);
    await expect(page.locator('#out')).toHaveText('AB', { timeout: 500 });
  });

  // 3. Time-dependent assertion: depends on the wall-clock millisecond parity.
  test('depends on wall-clock time', async ({ page }) => {
    await page.setContent('<p id="t"></p>');
    await page.evaluate(() => {
      document.getElementById('t')!.textContent = String(Date.now() % 2);
    });
    await expect(page.locator('#t')).toHaveText('0', { timeout: 1000 });
  });

  // 4. Order-dependent shared state: a flaky "random pick" the test treats as fixed.
  test('random item is assumed to be first', async ({ page }) => {
    await page.setContent(`
      <ul id="l"></ul>
      <script>
        const items = ['alpha', 'beta', 'gamma'].sort(() => Math.random() - 0.5);
        for (const i of items) { const li = document.createElement('li'); li.textContent = i; l.appendChild(li); }
      </script>`);
    await expect(page.locator('#l li').first()).toHaveText('alpha');
  });

  // 5. Deterministically flaky: fails on the first attempt, passes on retry.
  test('fails on first attempt only', async ({ page }, testInfo) => {
    await page.setContent('<p id="n">ok</p>');
    if (testInfo.retry === 0) {
      await expect(page.locator('#n')).toHaveText('not ok', { timeout: 500 });
    }
    await expect(page.locator('#n')).toHaveText('ok');
  });

  // 6. Stable control test, so the suite has a mix of flaky and passing tests.
  test('stable control', async ({ page }) => {
    await page.setContent('<h1>Hello</h1>');
    await expect(page.getByRole('heading')).toHaveText('Hello');
  });
});
