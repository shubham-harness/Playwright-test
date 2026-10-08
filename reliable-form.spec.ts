import { test, expect } from '@playwright/test';

const FORM = `
<!doctype html>
<html><body>
  <form id="signup" novalidate>
    <label>Email <input name="email" type="email"></label>
    <span id="email-err" role="alert"></span>
    <label>Password <input name="password" type="password"></label>
    <span id="pw-err" role="alert"></span>
    <label><input name="terms" type="checkbox"> Accept terms</label>
    <select name="plan" aria-label="Plan">
      <option value="free">Free</option>
      <option value="pro">Pro</option>
    </select>
    <button type="submit">Sign up</button>
  </form>
  <p id="result"></p>
  <script>
    document.getElementById('signup').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const email = f.email.value, pw = f.password.value;
      const emailErr = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email) ? '' : 'Invalid email';
      const pwErr = pw.length >= 8 ? '' : 'Password too short';
      document.getElementById('email-err').textContent = emailErr;
      document.getElementById('pw-err').textContent = pwErr;
      if (emailErr || pwErr) return;
      if (!f.terms.checked) { document.getElementById('result').textContent = 'Please accept terms'; return; }
      document.getElementById('result').textContent = 'Welcome ' + email + ' (' + f.plan.value + ')';
    });
  </script>
</body></html>`;

test.describe('signup form (reliable)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(FORM);
  });

  test('shows validation errors for empty submit', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page.locator('#email-err')).toHaveText('Invalid email');
    await expect(page.locator('#pw-err')).toHaveText('Password too short');
  });

  test('rejects short password', async ({ page }) => {
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page.locator('#email-err')).toBeEmpty();
    await expect(page.locator('#pw-err')).toHaveText('Password too short');
  });

  test('requires terms', async ({ page }) => {
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Password').fill('correct-horse');
    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page.locator('#result')).toHaveText('Please accept terms');
  });

  test('submits a valid form with selected plan', async ({ page }) => {
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Password').fill('correct-horse');
    await page.getByLabel('Accept terms').check();
    await page.getByLabel('Plan').selectOption('pro');
    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page.locator('#result')).toHaveText('Welcome ada@example.com (pro)');
  });

  for (const email of ['plain', 'no@tld', '@x.com', 'a b@x.com']) {
    test(`rejects invalid email "${email}"`, async ({ page }) => {
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill('correct-horse');
      await page.getByRole('button', { name: 'Sign up' }).click();
      await expect(page.locator('#email-err')).toHaveText('Invalid email');
    });
  }
});
