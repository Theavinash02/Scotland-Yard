const { test, expect } = require('@playwright/test');
const { bootToLobby, startLocal, trackPageErrors, hasHorizontalOverflow } = require('./helpers');

test('boots to the lobby and starts a game with the full map rendered', async ({ page }) => {
  const errors = trackPageErrors(page);
  await bootToLobby(page);
  await expect(page.locator('#startLocal')).toBeVisible();

  // Default-ish layout: the Phantom bot, one human agent, two bots.
  await startLocal(page, [
    { kind: 'bot', diff: 'hard' }, { kind: 'human' },
    { kind: 'bot', diff: 'normal' }, { kind: 'bot', diff: 'normal' },
    { kind: 'empty' }, { kind: 'empty' },
  ], { botSpeed: 'fast' });

  // 199 stations rendered as SVG groups; 469 station circles is the known count.
  await expect(page.locator('#L-stations .stg')).toHaveCount(199);
  expect(await page.locator('#map circle').count()).toBeGreaterThan(400);
  expect(errors, 'no uncaught page errors').toEqual([]);
});

test('page never scrolls horizontally (lobby and in-game)', async ({ page }) => {
  await bootToLobby(page);
  expect(await hasHorizontalOverflow(page), 'lobby has no horizontal overflow').toBe(false);

  await startLocal(page, [
    { kind: 'human' }, { kind: 'bot', diff: 'normal' },
    { kind: 'bot', diff: 'normal' }, { kind: 'empty' }, { kind: 'empty' }, { kind: 'empty' },
  ], { botSpeed: 'fast' });
  await page.waitForTimeout(300);
  expect(await hasHorizontalOverflow(page), 'in-game has no horizontal overflow').toBe(false);
});
