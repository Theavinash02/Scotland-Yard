const { test, expect } = require('@playwright/test');
const { bootToLobby, startLocal, hasHorizontalOverflow, revealPanel } = require('./helpers');

// These assertions matter most on the mobile-landscape project, but are true
// invariants on any viewport, so they run everywhere.
test('the new turn panel fits its column without clipping or page overflow', async ({ page }) => {
  await bootToLobby(page);
  await startLocal(page, [
    { kind: 'human' }, { kind: 'bot', diff: 'normal' },
    { kind: 'bot', diff: 'normal' }, { kind: 'empty' }, { kind: 'empty' }, { kind: 'empty' },
  ], { botSpeed: 'fast' });
  await page.waitForFunction(() => window.G && window.G.turn === -1);
  await revealPanel(page);

  // Reveal HUD, move list, and hint button are all present and on-screen.
  await expect(page.locator('.revhud')).toBeVisible();
  await expect(page.locator('#hintBtn')).toBeVisible();

  // The turn card must not overflow its own column horizontally.
  const clip = await page.evaluate(() => {
    const el = document.getElementById('turnCard');
    return el.scrollWidth > el.clientWidth + 1;
  });
  expect(clip, 'turn card content does not overflow its column').toBe(false);

  // Move buttons must be a comfortable tap target.
  const h = await page.locator('#movesList .movebtn').first().evaluate((el) => el.getBoundingClientRect().height);
  expect(h, 'move buttons are tappable').toBeGreaterThanOrEqual(28);

  expect(await hasHorizontalOverflow(page)).toBe(false);
});

test('the settings modal fits within the viewport', async ({ page }) => {
  await bootToLobby(page);
  await page.evaluate(() => window.showSettings());
  await expect(page.locator('#setTheme')).toBeVisible();
  const overflow = await page.evaluate(() => {
    const box = document.getElementById('modalBox');
    return box.scrollWidth > box.clientWidth + 1;
  });
  expect(overflow, 'settings content fits the modal width').toBe(false);
  expect(await hasHorizontalOverflow(page)).toBe(false);
});
