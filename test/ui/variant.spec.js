const { test, expect } = require('@playwright/test');
const { bootToLobby, trackPageErrors } = require('./helpers');

test('selecting the "short" game mode changes the rules of the started game', async ({ page }) => {
  const errors = trackPageErrors(page);
  await bootToLobby(page);

  // Pick the Short chase mode through the real lobby control.
  await page.selectOption('#variantSel', 'short');
  await expect(page.locator('#variantDesc')).toContainText(/12-round/i);

  await page.evaluate(() => {
    window.localSeats = [
      { kind: 'human' }, { kind: 'bot', diff: 'normal' },
      { kind: 'bot', diff: 'normal' }, { kind: 'empty' }, { kind: 'empty' }, { kind: 'empty' },
    ];
    window.startLocalGame();
  });
  await page.waitForSelector('#screen-game', { state: 'visible' });

  // The game object carries the short-variant rules.
  const g = await page.evaluate(() => ({ variant: window.G.variant, maxRound: window.G.maxRound, reveals: window.G.reveals }));
  expect(g.variant).toBe('short');
  expect(g.maxRound).toBe(12);
  expect(g.reveals).toEqual([3, 6, 9, 12]);

  // UI reflects it: the round banner counts to 12 and the log grid has 12 cells.
  await expect(page.locator('#banner')).toContainText('/ 12');
  await expect(page.locator('#logGrid .lcell')).toHaveCount(12);
  // Reveal HUD points at the first short-variant reveal (round 3).
  await expect(page.locator('.revhud')).toContainText('round 3');

  expect(errors).toEqual([]);
});
