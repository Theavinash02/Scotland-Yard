// The monetization layer (ads.js): dormant with the shipped placeholder
// config; when configured, shows an interstitial break ONLY at lobby-return
// after a finished game, gated behind the no-ads entitlement and a frequency
// cap. Purchases write entitlements.noAds locally and to the cloud.
'use strict';
const { test, expect } = require('@playwright/test');
const { bootToLobby, trackPageErrors } = require('./helpers');

test('ads layer is dormant with the placeholder config', async ({ page }) => {
  const errors = trackPageErrors(page);
  await bootToLobby(page);
  await page.evaluate(() => {
    window.G = { winner: 'mrx', seats: [], log: [] };
    ADS.gamesFinished = 5;
    leaveToLobby();
  });
  expect(await page.evaluate(() => !document.getElementById('adBreak'))).toBe(true);
  expect(errors).toEqual([]);
});

test('configured ads show at lobby-return, respect the cap and the entitlement', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.route(/pagead2\.googlesyndication\.com/, (r) => r.abort());
  await bootToLobby(page);

  // configure web ads, finish a game, return to lobby -> break appears
  await page.evaluate(() => {
    MONETIZATION.enabled = true;
    MONETIZATION.web.client = 'ca-pub-TEST';
    MONETIZATION.web.slot = '123';
    window.G = { winner: 'dets', seats: [], log: [] };
    leaveToLobby();
  });
  await expect(page.locator('#adBreak')).toContainText(/sponsors|remove ads/i);

  // close after the short gate
  await page.waitForTimeout(3300);
  await page.evaluate(() => document.getElementById('adCloseBtn').click());
  expect(await page.evaluate(() => document.getElementById('adBreak').hidden)).toBe(true);

  // frequency cap: an immediate second finished game shows nothing
  await page.evaluate(() => { window.G = { winner: 'mrx' }; leaveToLobby(); });
  expect(await page.evaluate(() => document.getElementById('adBreak').hidden)).toBe(true);

  // the no-ads entitlement suppresses ads even past the cap
  await page.evaluate(() => {
    localStorage.setItem('sy_noads', '1');
    ADS.lastShown = 0;
    window.G = { winner: 'mrx' }; leaveToLobby();
  });
  expect(await page.evaluate(() => document.getElementById('adBreak').hidden)).toBe(true);

  expect(errors).toEqual([]);
});

test('a native purchase grants no-ads locally and syncs the entitlement', async ({ page }) => {
  const errors = trackPageErrors(page);
  await bootToLobby(page);
  const res = await page.evaluate(() => {
    window.__PUSHED = [];
    window.cloudPushDoc = (f) => { window.__PUSHED.push(f); };
    CLOUD.ready = true; CLOUD.user = { uid: 'U1' };
    window.Capacitor = { isNativePlatform: () => true, Plugins: { Purchases: { purchaseProduct: () => Promise.resolve() } } };
    MONETIZATION.enabled = true;
    return purchaseRemoveAds(), null;
  });
  await page.waitForTimeout(200);
  const state = await page.evaluate(() => ({
    local: localStorage.getItem('sy_noads'),
    pushed: window.__PUSHED.length ? window.__PUSHED[0].entitlements.noAds : null,
  }));
  expect(state.local).toBe('1');
  expect(state.pushed).toBe(true);
  expect(errors).toEqual([]);
});
