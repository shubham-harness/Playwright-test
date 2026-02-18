import { test, expect } from '@playwright/test';

test.describe('Tunnel Connectivity', () => {
  test('should reach the app behind the tunnel', async ({ page }) => {
    // Navigate to the base URL (resolved via tunnel if proxy is configured)
    await page.goto('/');

    // Verify the page loaded correctly
    await expect(page).toHaveTitle('Tunnel Test App');

    // Verify the heading is visible
    const heading = page.getByTestId('heading');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('Tunnel Test App');

    // Verify the status message confirms connectivity
    const status = page.getByTestId('status');
    await expect(status).toBeVisible();
    await expect(status).toHaveText('Connection Successful');
  });

  test('should be able to interact with the page', async ({ page }) => {
    await page.goto('/');

    // Verify page is fully loaded and interactive
    await expect(page.locator('body')).toBeVisible();

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test-results/tunnel-connectivity.png' });
  });
});

