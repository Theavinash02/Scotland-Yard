// Shared helpers for the Playwright UI suite.
'use strict';

// Boot the app straight to the lobby: suppress the first-run demo, load the
// page, tear down the (video) intro sequence, and clear any leftover modal.
async function bootToLobby(page) {
  await page.addInitScript(() => {
    try { localStorage.setItem('sy_demo_seen', '1'); } catch (e) {}
  });
  await page.goto('/index.html', { waitUntil: 'load' });
  await page.evaluate(() => window.introTeardown && window.introTeardown());
  await page.evaluate(() => { try { if (window.hideModal) window.hideModal(); } catch (e) {} });
  await page.waitForSelector('#screen-lobby', { state: 'visible' });
}

// Start a local game with a given seat layout by calling the app's own entry
// point, so tests don't depend on clicking through the seat pickers.
// layout: array of 6 seat objects, e.g. {kind:'human'} / {kind:'bot',diff:'hard'} / {kind:'empty'}.
async function startLocal(page, layout, opts) {
  opts = opts || {};
  await page.evaluate(({ layout, botSpeed }) => {
    if (botSpeed) window.SETTINGS.botSpeed = botSpeed;
    window.localSeats = layout;
    window.startLocalGame();
  }, { layout, botSpeed: opts.botSpeed });
  await page.waitForSelector('#screen-game', { state: 'visible' });
}

// Fail-fast collector for uncaught page exceptions (the meaningful error signal;
// console network noise is environment-dependent and intentionally ignored).
function trackPageErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

// The document must never scroll horizontally on any viewport.
async function hasHorizontalOverflow(page) {
  return page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

module.exports = { bootToLobby, startLocal, trackPageErrors, hasHorizontalOverflow };
