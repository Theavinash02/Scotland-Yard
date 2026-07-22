// The optional cloud layer (cloud.js): stays fully dormant with the shipped
// placeholder config, and — against a stubbed Firebase — signs in, merges
// histories both ways, caches the no-ads entitlement, and strips replay logs
// from cloud copies.
'use strict';
const { test, expect } = require('@playwright/test');
const { bootToLobby, trackPageErrors } = require('./helpers');

test('cloud layer is dormant with the placeholder config', async ({ page }) => {
  const errors = trackPageErrors(page);
  await bootToLobby(page);
  const state = await page.evaluate(() => ({
    enabled: CLOUD.enabled,
    boxHidden: document.getElementById('accountBox').hidden,
  }));
  expect(state.enabled).toBe(false);
  expect(state.boxHidden).toBe(true);
  // the historyRecord wrapper must still record locally
  await page.evaluate(() => historyRecord({ date: Date.now(), role: 'det', result: 'win', round: 5, mode: 'local', moveLog: [] }));
  expect(await page.evaluate(() => historyLoad().length)).toBe(1);
  expect(errors).toEqual([]);
});

test('sign-in merges local and cloud histories and caches the entitlement', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.addInitScript(() => {
    // minimal firebase compat stub
    window.__SETS = [];
    const fsDoc = {
      onSnapshot: (cb) => { window.__snapCb = cb; return () => {}; },
      set: (fields) => { window.__SETS.push(fields); return Promise.resolve(); },
    };
    window.firebase = {
      initializeApp: () => {},
      auth: Object.assign(() => ({
        onAuthStateChanged: (cb) => { window.__authCb = cb; },
        signOut: () => { window.__authCb(null); },
        signInWithPopup: () => Promise.resolve(),
      }), { GoogleAuthProvider: function () {} }),
      firestore: () => ({ collection: () => ({ doc: () => fsDoc }) }),
    };
  });
  await bootToLobby(page);
  await page.evaluate(() => {
    historySave([{ date: 1000, role: 'det', result: 'win', round: 7, mode: 'local', moveLog: [{ round: 1 }] }]);
    window.FIREBASE_CONFIG = { apiKey: 'real', authDomain: 'x', projectId: 'x', appId: 'x' };
    cloudInit();
  });
  await expect(page.locator('#accountBox')).toContainText(/sign in with google/i);

  await page.evaluate(() => {
    window.__authCb({ uid: 'U1', displayName: 'Avi', photoURL: '' });
    window.__snapCb({ exists: true, data: () => ({
      entitlements: { noAds: true },
      history: [{ date: 2000, role: 'mrx', result: 'loss', round: 12, mode: 'online' }],
    }) });
  });
  await expect(page.locator('#accountBox')).toContainText(/sign out/i);
  const st = await page.evaluate(() => ({
    dates: historyLoad().map((e) => e.date),
    noAds: cloudNoAds(),
    pushedLens: window.__SETS.map((f) => (f.history || []).length),
    logsStripped: window.__SETS.every((f) => (f.history || []).every((e) => !('moveLog' in e))),
  }));
  expect(st.dates).toEqual([2000, 1000]); // merged, newest first
  expect(st.noAds).toBe(true);
  expect(st.pushedLens.pop()).toBe(2);    // cloud received the local-only game
  expect(st.logsStripped).toBe(true);
  expect(errors).toEqual([]);
});
