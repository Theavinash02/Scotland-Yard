const { test, expect } = require('@playwright/test');
const { bootToLobby, trackPageErrors } = require('./helpers');

test('settings toggles apply and persist across reload', async ({ page }) => {
  const errors = trackPageErrors(page);
  await bootToLobby(page);

  await page.evaluate(() => window.showSettings());
  await expect(page.locator('#setTheme')).toBeVisible();

  // Toggle via the app's own handlers (the switch inputs are visually hidden).
  await page.evaluate(() => {
    document.querySelector('#setTheme button[data-theme=light]').click();
    document.getElementById('setContrast').click();
    document.querySelector('#setSpeed button[data-speed=fast]').click();
    const v = document.getElementById('setVol'); v.value = 25; v.oninput();
  });

  await expect(page.locator('body')).toHaveClass(/theme-light/);
  await expect(page.locator('body')).toHaveClass(/hc/);

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('sy_settings')));
  expect(saved.theme).toBe('light');
  expect(saved.highContrast).toBe(true);
  expect(saved.botSpeed).toBe('fast');
  expect(saved.volume).toBeCloseTo(0.25, 2);

  // Persist across a reload.
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => window.loadSettings && window.loadSettings());
  await expect(page.locator('body')).toHaveClass(/theme-light/);
  expect(await page.evaluate(() => window.SETTINGS.botSpeed)).toBe('fast');
  expect(errors).toEqual([]);
});

test('history screen shows achievements and a results timeline', async ({ page }) => {
  await bootToLobby(page);
  await page.evaluate(() => {
    localStorage.setItem('sy_history', JSON.stringify([
      { date: Date.now(), role: 'det', result: 'win', round: 7, mode: 'local', opponents: 'bots' },
      { date: Date.now(), role: 'mrx', result: 'win', round: 24, mode: 'local', opponents: 'human' },
    ]));
    window.showHistory();
  });
  await expect(page.locator('.achgrid .ach')).toHaveCount(7);
  expect(await page.locator('.ach.got').count()).toBeGreaterThan(0);
  await expect(page.locator('svg.statschart')).toBeVisible();
  expect(await page.locator('.statschart rect').count()).toBe(2);
});
