const { test, expect } = require('@playwright/test');
const { bootToLobby, startLocal, trackPageErrors } = require('./helpers');

// Human plays Mr. X (turn -1), so the accessible move list and turn HUD are
// available immediately without a hot-seat privacy handoff.
async function startAsMrX(page) {
  await startLocal(page, [
    { kind: 'human' }, { kind: 'bot', diff: 'normal' },
    { kind: 'bot', diff: 'normal' }, { kind: 'bot', diff: 'normal' },
    { kind: 'empty' }, { kind: 'empty' },
  ], { botSpeed: 'fast' });
  await page.waitForFunction(() => window.G && window.G.turn === -1);
}

test('turn panel shows the reveal HUD and an accessible move list', async ({ page }) => {
  const errors = trackPageErrors(page);
  await bootToLobby(page);
  await startAsMrX(page);

  await expect(page.locator('.revhud')).toBeVisible();
  await expect(page.locator('.revhud')).toContainText(/surfaces/i);
  const moveBtns = page.locator('#movesList .movebtn');
  expect(await moveBtns.count()).toBeGreaterThan(0);
  // Each move button carries a descriptive aria-label for screen readers.
  await expect(moveBtns.first()).toHaveAttribute('aria-label', /Move to station \d+ by/);

  // The live region announces the turn.
  await expect(page.locator('#srLive')).toContainText(/Your move/);
  expect(errors).toEqual([]);
});

test('hint suggests a legal move and committing via the list advances the turn', async ({ page }) => {
  await bootToLobby(page);
  await startAsMrX(page);

  await page.locator('#hintBtn').click();
  await expect(page.locator('.movebtn.suggest')).toHaveCount(1);
  await expect(page.locator('#srLive')).toContainText(/Suggested/);

  const before = await page.evaluate(() => window.G.mrx.st);
  await page.locator('#movesList .movebtn').first().click();
  await page.waitForFunction((b) => window.G && window.G.mrx.st !== b, before);
  expect(await page.evaluate(() => window.G.mv)).toBeGreaterThan(0);
});

test('possible-spots overlay renders a belief heatmap', async ({ page }) => {
  await bootToLobby(page);
  await startAsMrX(page);
  await page.evaluate(() => { window.UI.showPs = true; window.render(); });
  const halos = page.locator('#L-ps .psheat');
  expect(await halos.count()).toBeGreaterThan(0);
  // One halo per deduced possible location.
  expect(await halos.count()).toBe(await page.evaluate(() => window.possibleSet(window.G).size));
});
