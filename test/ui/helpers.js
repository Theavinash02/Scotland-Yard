// Shared helpers for the Playwright UI suite.
'use strict';

// Boot the app straight to the lobby: suppress the first-run demo, load the
// page, tear down the (video) intro sequence, and clear any leftover modal.
async function bootToLobby(page) {
  await page.addInitScript(() => {
    try { localStorage.setItem('sy_demo_seen', '1'); } catch (e) {}
  });
  // Abort the app's optional third-party CDN assets (PeerJS, driver.js, Google
  // Fonts). The app degrades gracefully without them, and this keeps the suite
  // hermetic and fast: otherwise each page load blocks for seconds on those
  // synchronous <script>/<link> tags (instant here vs. their network timeout).
  await page.route(/^https?:\/\/(unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/, (r) => r.abort());
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

// On phones (short landscape) the info panel is a slide-over drawer that starts
// closed over a full-bleed map; on wider viewports it stays docked and visible.
async function isDrawerLayout(page) {
  return page.evaluate(() =>
    matchMedia('(orientation:landscape) and (max-height:600px)').matches);
}

// Ensure the panel content (turn card, moves, actions) is on-screen regardless
// of layout — opens the drawer first when in the phone drawer layout.
async function revealPanel(page) {
  if (await isDrawerLayout(page)) {
    const open = await page.evaluate(() =>
      document.getElementById('screen-game').classList.contains('side-open'));
    if (!open) await page.locator('#sideToggle').click();
    await page.waitForSelector('#screen-game.side-open');
  }
}

module.exports = {
  bootToLobby, startLocal, trackPageErrors, hasHorizontalOverflow,
  isDrawerLayout, revealPanel,
};
