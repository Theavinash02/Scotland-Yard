/* ---------------- monetization config ----------------
 * OWNER TODO: drop in your real ad + billing IDs. While `enabled` is false
 * (or every id still starts with "REPLACE_") the entire ads/IAP layer stays
 * dormant: no SDK is fetched, no ad UI exists, and the game behaves exactly
 * like the free build. Safe to ship as-is.
 *
 * Setup checklist (see STORE-CHECKLIST.md for the store-side steps):
 *  Web (PWA):
 *   1. AdSense account -> add your site -> create an ad unit.
 *   2. Set web.client ("ca-pub-...") and web.slot below; set enabled:true.
 *  Native (Capacitor, Phase 6):
 *   3. AdMob account -> create app + interstitial ad unit per platform.
 *   4. Set admob.appId / admob.interstitialId (the values below are Google's
 *      published TEST ids — they show test ads, never revenue).
 *   5. Play Billing / StoreKit: create a "remove_ads" non-consumable product
 *      and set iap.productId.
 *  Remove-ads entitlement: purchases set entitlements.noAds in Firestore
 *  (cloud.js), so "no ads" follows the signed-in account across devices.
 */
var MONETIZATION = {
  enabled: false,           // master switch — nothing loads while false
  minSecondsBetweenAds: 180, // frequency cap for interstitial breaks
  graceGames: 1,             // never show an ad before this many finished games
  web: {
    client: "REPLACE_ME",   // AdSense publisher id, e.g. "ca-pub-1234567890123456"
    slot: "REPLACE_ME"      // AdSense ad unit slot id
  },
  admob: {
    appId: "ca-app-pub-3940256099942544~3347511713",           // Google TEST app id
    interstitialId: "ca-app-pub-3940256099942544/1033173712"   // Google TEST interstitial
  },
  iap: {
    productId: "remove_ads",
    priceLabel: "$2.99"     // display only; stores are the source of truth
  }
};
