import { test, expect } from '@playwright/test';

// Network is fully mocked with page.route, so results never depend on a real server.
const USERS = [
  { id: 1, name: 'Ada Lovelace', role: 'admin' },
  { id: 2, name: 'Alan Turing', role: 'user' },
];

const PAGE = `
<!doctype html>
<html><body>
  <button id="load">Load users</button>
  <p id="status">idle</p>
  <ul id="users"></ul>
  <script>
    document.getElementById('load').addEventListener('click', async () => {
      const status = document.getElementById('status');
      status.textContent = 'loading';
      try {
        const res = await fetch('/api/users');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const users = await res.json();
        const ul = document.getElementById('users');
        ul.innerHTML = '';
        for (const u of users) {
          const li = document.createElement('li');
          li.textContent = u.name + ' (' + u.role + ')';
          ul.appendChild(li);
        }
        status.textContent = 'loaded';
      } catch (e) {
        status.textContent = 'error: ' + e.message;
      }
    });
  </script>
</body></html>`;

test.describe('mocked API (reliable)', () => {
  test.beforeEach(async ({ page }) => {
    // Serve the page from a fake origin so relative fetches can be intercepted.
    await page.route('http://app.test/', (route) =>
      route.fulfill({ contentType: 'text/html', body: PAGE }),
    );
  });

  test('loads and renders users', async ({ page }) => {
    await page.route('**/api/users', (route) => route.fulfill({ json: USERS }));
    await page.goto('http://app.test/');
    await expect(page.locator('#status')).toHaveText('idle');
    await page.getByRole('button', { name: 'Load users' }).click();
    await expect(page.locator('#status')).toHaveText('loaded');
    await expect(page.locator('#users li')).toHaveText([
      'Ada Lovelace (admin)',
      'Alan Turing (user)',
    ]);
  });

  test('renders empty list', async ({ page }) => {
    await page.route('**/api/users', (route) => route.fulfill({ json: [] }));
    await page.goto('http://app.test/');
    await page.getByRole('button', { name: 'Load users' }).click();
    await expect(page.locator('#status')).toHaveText('loaded');
    await expect(page.locator('#users li')).toHaveCount(0);
  });

  test('shows error on server failure', async ({ page }) => {
    await page.route('**/api/users', (route) => route.fulfill({ status: 500, body: 'boom' }));
    await page.goto('http://app.test/');
    await page.getByRole('button', { name: 'Load users' }).click();
    await expect(page.locator('#status')).toHaveText('error: HTTP 500');
  });

  test('sends exactly one request per click', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/users', (route) => {
      calls++;
      return route.fulfill({ json: USERS });
    });
    await page.goto('http://app.test/');
    const request = page.waitForRequest('**/api/users');
    await page.getByRole('button', { name: 'Load users' }).click();
    expect((await request).method()).toBe('GET');
    await expect(page.locator('#status')).toHaveText('loaded');
    expect(calls).toBe(1);
  });
});
