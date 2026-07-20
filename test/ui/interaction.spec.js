const { test, expect } = require('@playwright/test');
const { bootToLobby, startLocal } = require('./helpers');

test('dragging to pan the map does not select the map labels', async ({ page }) => {
  await bootToLobby(page);
  await startLocal(page, [
    { kind: 'human' }, { kind: 'bot', diff: 'normal' },
    { kind: 'bot', diff: 'normal' }, { kind: 'empty' }, { kind: 'empty' }, { kind: 'empty' },
  ], { botSpeed: 'fast' });

  const map = page.locator('#map');
  const box = await map.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // A press-drag-release across the map, as if panning past the district labels.
  await page.mouse.move(cx - 120, cy);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(cx - 120 + i * 40, cy + i * 6);
  await page.mouse.up();

  const selected = await page.evaluate(() => (window.getSelection() || '').toString());
  expect(selected, 'no text is selected after panning').toBe('');
});

test('the side panel can be collapsed to give the map more room', async ({ page }) => {
  await bootToLobby(page);
  await startLocal(page, [
    { kind: 'human' }, { kind: 'bot', diff: 'normal' },
    { kind: 'bot', diff: 'normal' }, { kind: 'empty' }, { kind: 'empty' }, { kind: 'empty' },
  ], { botSpeed: 'fast' });

  const side = page.locator('#side');
  const mapWidth = () => page.locator('#mapwrap').evaluate((el) => el.getBoundingClientRect().width);

  await expect(side).toBeVisible();
  const widthOpen = await mapWidth();

  await page.locator('#sideToggle').click();
  await expect(side).toBeHidden();
  const widthCollapsed = await mapWidth();
  expect(widthCollapsed, 'map gets wider when the panel is collapsed').toBeGreaterThan(widthOpen);

  // No horizontal page overflow in the collapsed state either.
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);

  await page.locator('#sideToggle').click();
  await expect(side).toBeVisible();
});
