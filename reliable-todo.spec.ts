import { test, expect, Page } from '@playwright/test';

// Self-contained: the app under test is rendered from inline HTML, so these
// tests have no network or backend dependency and are fully deterministic.
const TODO_APP = `
<!doctype html>
<html>
  <head><title>Todo</title></head>
  <body>
    <h1>Todo</h1>
    <form id="form">
      <label for="new">New item</label>
      <input id="new" placeholder="What needs to be done?" />
      <button type="submit">Add</button>
    </form>
    <ul id="list"></ul>
    <p id="count">0 items left</p>
    <script>
      const list = document.getElementById('list');
      const count = document.getElementById('count');
      function update() {
        const left = list.querySelectorAll('li:not(.done)').length;
        count.textContent = left + (left === 1 ? ' item left' : ' items left');
      }
      document.getElementById('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('new');
        const text = input.value.trim();
        if (!text) return;
        const li = document.createElement('li');
        li.innerHTML = '<input type="checkbox" aria-label="toggle"> <span></span> <button class="del">Delete</button>';
        li.querySelector('span').textContent = text;
        li.querySelector('input').addEventListener('change', (ev) => {
          li.classList.toggle('done', ev.target.checked);
          update();
        });
        li.querySelector('.del').addEventListener('click', () => { li.remove(); update(); });
        list.appendChild(li);
        input.value = '';
        update();
      });
    </script>
  </body>
</html>`;

async function addTodo(page: Page, text: string) {
  await page.getByPlaceholder('What needs to be done?').fill(text);
  await page.getByRole('button', { name: 'Add' }).click();
}

test.describe('todo app (reliable)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(TODO_APP);
  });

  test('renders empty state', async ({ page }) => {
    await expect(page).toHaveTitle('Todo');
    await expect(page.getByRole('heading', { name: 'Todo' })).toBeVisible();
    await expect(page.locator('#list li')).toHaveCount(0);
    await expect(page.locator('#count')).toHaveText('0 items left');
  });

  test('adds a todo item', async ({ page }) => {
    await addTodo(page, 'Write tests');
    await expect(page.locator('#list li')).toHaveCount(1);
    await expect(page.locator('#list li span')).toHaveText('Write tests');
    await expect(page.locator('#count')).toHaveText('1 item left');
    await expect(page.getByPlaceholder('What needs to be done?')).toHaveValue('');
  });

  test('ignores blank input', async ({ page }) => {
    await addTodo(page, '   ');
    await expect(page.locator('#list li')).toHaveCount(0);
  });

  test('adds multiple items in order', async ({ page }) => {
    for (const item of ['one', 'two', 'three']) await addTodo(page, item);
    await expect(page.locator('#list li span')).toHaveText(['one', 'two', 'three']);
    await expect(page.locator('#count')).toHaveText('3 items left');
  });

  test('completes an item', async ({ page }) => {
    await addTodo(page, 'a');
    await addTodo(page, 'b');
    await page.locator('#list li').first().getByRole('checkbox').check();
    await expect(page.locator('#list li').first()).toHaveClass('done');
    await expect(page.locator('#count')).toHaveText('1 item left');
  });

  test('deletes an item', async ({ page }) => {
    await addTodo(page, 'a');
    await addTodo(page, 'b');
    await page.locator('#list li').first().getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('#list li span')).toHaveText(['b']);
    await expect(page.locator('#count')).toHaveText('1 item left');
  });
});
