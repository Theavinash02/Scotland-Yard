/* ---------------- native-init.js — Capacitor native bootstrap ----------------
 * Runs only inside the Capacitor native shell (Android/iOS). On the web/PWA
 * and in CI, window.Capacitor is undefined and every branch here is skipped,
 * so this file is completely inert outside a native build.
 *
 * Responsibilities on native:
 *   - hide the splash screen once the app shell has booted;
 *   - initialize the AdMob plugin (consent + init) so ads.js's
 *     prepareInterstitial/showInterstitial calls have a ready SDK — still
 *     gated by the no-ads entitlement and only shown at natural breaks;
 *   - apply a dark status bar to match the noir shell.
 *
 * The actual plugins (@capacitor-community/admob, @capacitor/splash-screen,
 * @capacitor/status-bar, a billing plugin exposing Purchases.purchaseProduct)
 * are installed during the native setup — see native/README.md. Each call is
 * defensively guarded so a missing plugin never throws.
 */
(function () {
  'use strict';
  var Cap = window.Capacitor;
  if (!Cap || typeof Cap.isNativePlatform !== 'function' || !Cap.isNativePlatform()) return;
  var P = Cap.Plugins || {};

  function safe(fn) { try { return fn(); } catch (e) { /* plugin absent — ignore */ } }

  window.addEventListener('load', function () {
    // status bar: light content on the dark shell
    safe(function () {
      if (P.StatusBar && P.StatusBar.setStyle) {
        P.StatusBar.setStyle({ style: 'DARK' });
        if (P.StatusBar.setBackgroundColor) P.StatusBar.setBackgroundColor({ color: '#0F1722' });
      }
    });

    // AdMob: initialize once so interstitials can prepare on demand.
    safe(function () {
      if (P.AdMob && P.AdMob.initialize) {
        P.AdMob.initialize({
          initializeForTesting: !!(window.MONETIZATION && !window.MONETIZATION.enabled),
          tagForChildDirectedTreatment: false
        });
      }
    });

    // dismiss the splash a moment after the shell is interactive
    safe(function () {
      if (P.SplashScreen && P.SplashScreen.hide) {
        setTimeout(function () { safe(function () { P.SplashScreen.hide(); }); }, 350);
      }
    });
  });
})();
